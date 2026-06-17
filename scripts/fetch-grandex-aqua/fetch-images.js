// Скачивает картинки для товаров grandex-aqua из image-queue.json,
// оптимизирует через Sharp и грузит в S3 + пишет в product_images.
//
// Без Puppeteer — URL-ы картинок уже собраны на этапе scrape.
// Матчинг с БД через external_id (товары должны быть импортированы заранее через import.js).
//
// Режимы (как в fetch-tetrasis-images):
//   FETCH_IMAGES_MODE=missing (default) — skip товары с уже существующими fetch-картинками
//   FETCH_IMAGES_MODE=full              — заменить старые fetch-картинки (удалить старые из S3 + БД)
//
// Запуск (5 тестовых):
//   node scripts/fetch-grandex-aqua/fetch-images.js --limit 5
// Запуск (все):
//   node scripts/fetch-grandex-aqua/fetch-images.js

import 'dotenv/config'
import postgres from 'postgres'
import sharp from 'sharp'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuid } from 'uuid'

const __filename = fileURLToPath(import.meta.url)
const ROOT = path.dirname(__filename)
const SOURCE = 'grandex-aqua'
const QUEUE_FILE = path.resolve(`${ROOT}/image-queue.json`)
const LOG = path.resolve(`${ROOT}/fetch-images.log`)

// --limit N
const limitArg = process.argv.find(a => a.startsWith('--limit'))
const LIMIT = limitArg ? Number(limitArg.split('=')[1] || process.argv[process.argv.indexOf(limitArg) + 1]) : 0

// Параметры (как в fetch-tetrasis-images)
const MODE = process.env.FETCH_IMAGES_MODE || 'missing' // 'missing' | 'full'
const IMAGE_DELAY = Number(process.env.FETCH_IMAGES_IMAGE_DELAY || 200)
const RETRIES = Number(process.env.FETCH_IMAGES_RETRIES || 3)
const RETRY_DELAY = Number(process.env.FETCH_IMAGES_RETRY_DELAY || 3000)
const JPEG_QUALITY = Number(process.env.FETCH_IMAGES_JPEG_QUALITY || 78)
const MAX_SIZE = Number(process.env.FETCH_IMAGES_MAX_SIZE || 1600)
const MIN_ORIGINAL_SIZE_KB = Number(process.env.FETCH_IMAGES_MIN_ORIGINAL_SIZE_KB || 120)

const sleep = ms => new Promise(r => setTimeout(r, ms))
const colors = { green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', blue: '\x1b[36m', gray: '\x1b[90m', reset: '\x1b[0m' }
const stripAnsi = v => String(v).replace(/\x1b\[[0-9;]*m/g, '')
const now = () => new Date().toISOString()
async function writeLog(line) { console.log(line); await fs.appendFile(LOG, stripAnsi(line) + '\n') }
async function logLine(color, ...a) { await writeLog(`${colors.gray}${now()}${colors.reset} ${color}${a.join(' ')}${colors.reset}`) }
async function logInfo(...a) { await logLine(colors.blue, ...a) }
async function logSuccess(...a) { await logLine(colors.green, ...a) }
async function logWarn(...a) { await logLine(colors.yellow, ...a) }
async function logError(...a) { await logLine(colors.red, ...a) }

async function withRetry(label, fn) {
  let lastError
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try { return await fn(attempt) }
    catch (e) {
      lastError = e
      if (attempt < RETRIES) await sleep(RETRY_DELAY * attempt)
    }
  }
  throw lastError
}

const kb = bytes => Math.round(bytes / 1024)
const sum = (rows, key) => rows.reduce((acc, r) => acc + (r[key] || 0), 0)

// S3
const S3_PUBLIC_PREFIX = `${process.env.S3_ENDPOINT.replace(/\/$/, '')}/${process.env.S3_BUCKET}/`
function s3KeyFromUrl(url) {
  if (!url?.startsWith(S3_PUBLIC_PREFIX)) return null
  return decodeURIComponent(url.slice(S3_PUBLIC_PREFIX.length))
}

async function optimizeImage(buffer) {
  return await sharp(buffer).rotate().resize({ width: MAX_SIZE, height: MAX_SIZE, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: JPEG_QUALITY, progressive: true, mozjpeg: true }).toBuffer()
}

async function uploadToS3(buffer, key) {
  return await withRetry(`s3:${key}`, async () => {
    await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: buffer, ACL: 'public-read', ContentType: 'image/jpeg', CacheControl: 'public, max-age=31536000, immutable' }))
    return `${S3_PUBLIC_PREFIX}${key}`
  })
}

async function deleteFromS3(key) {
  await withRetry(`delete-s3:${key}`, async () => {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
  })
}

async function download(url) {
  return await withRetry(`download:${url}`, async () => {
    await sleep(IMAGE_DELAY)
    const r = await fetch(url)
    if (!r.ok) throw new Error('download ' + r.status)
    return Buffer.from(await r.arrayBuffer())
  })
}

// Фильтрация image_urls от мусора и дедупликация resize_cache vs оригиналов.
function filterImageUrls(urls) {
  const seen = new Set() // сигнатуры (имя файла оригинала)
  const result = []
  for (const url of urls) {
    if (!url || typeof url !== 'string') continue
    // 1) Выбрасываем data:-URL (base64 спейсеры)
    if (url.startsWith('data:')) continue
    // 2) Выбрасываем видео (включая /video/*.jpg — это обложки, такого функционала на сайте нет)
    if (/\/video\//i.test(url)) continue
    if (/\.(mp4|webm|mov|avi)(\?|$)/i.test(url)) continue
    // 3) Оставляем только картинки
    if (!/\.(jpe?g|png|webp)(\?|$)/i.test(url)) continue
    // 4) Дедупликация по сигнатуре
    //    Оригинал:    /upload/iblock/3dc/jbjf45i...jpg        → сигнатура jbjf45i...jpg
    //    resize_cache:/upload/resize_cache/iblock/3dc/.../jbjf45i...jpg → та же сигнатура
    //    Берём последний сегмент пути. Для resize_cache он совпадает с оригиналом.
    let sig
    try {
      const u = new URL(url)
      const parts = u.pathname.split('/')
      sig = parts[parts.length - 1].toLowerCase()
    } catch {
      sig = url.split('/').pop().split('?')[0].toLowerCase()
    }
    if (!sig) continue
    if (seen.has(sig)) continue
    seen.add(sig)
    result.push(url)
  }
  return result
}

// Подключение к БД и S3 (глобально — чтобы закрывались в finally)
let sql, s3, BUCKET

async function prepareImage(productId, imgUrl, pos) {
  const id = uuid()
  const key = `products/${SOURCE}/${id}.jpg`
  const original = await download(imgUrl)
  const originalSize = original.length
  const shouldOptimize = kb(originalSize) >= MIN_ORIGINAL_SIZE_KB
  const finalBuffer = shouldOptimize ? await optimizeImage(original) : original
  const finalSize = finalBuffer.length
  const s3Url = await uploadToS3(finalBuffer, key)
  return { id, product_id: productId, url: s3Url, source: 'fetch', source_url: imgUrl, position: pos, originalSize, finalSize, optimized: shouldOptimize }
}

async function saveMissingImages(rows) {
  for (const row of rows) await sql`insert into product_images(id,product_id,url,source,source_url,position) values(${row.id},${row.product_id},${row.url},${row.source},${row.source_url},${row.position})`
}

async function replaceProductImages(productId, rows) {
  const oldRows = await sql`select url from product_images where product_id=${productId} and source='fetch'`
  await sql.begin(async tx => {
    await tx`delete from product_images where product_id=${productId} and source='fetch'`
    for (const row of rows) await tx`insert into product_images(id,product_id,url,source,source_url,position) values(${row.id},${row.product_id},${row.url},${row.source},${row.source_url},${row.position})`
  })
  let deleted = 0
  for (const old of oldRows) {
    const key = s3KeyFromUrl(old.url)
    if (!key) continue
    try { await deleteFromS3(key); deleted++ }
    catch (e) { await logError('DELETE_OLD_ERROR', old.url, e.message) }
  }
  return deleted
}

async function main() {
  sql = postgres({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 5432), database: process.env.DB_NAME, username: process.env.DB_USER, password: process.env.DB_PASSWORD })
  s3 = new S3Client({ region: 'reg', endpoint: process.env.S3_ENDPOINT, credentials: { accessKeyId: process.env.S3_ACCESS_KEY, secretAccessKey: process.env.S3_SECRET_KEY }, forcePathStyle: true })
  BUCKET = process.env.S3_BUCKET

  try {
    await fs.writeFile(LOG, '')

    // Читаем очередь
    const queue = await fs.readJson(QUEUE_FILE)
    const subset = LIMIT > 0 ? queue.slice(0, LIMIT) : queue
    if (!subset.length) {
      await logInfo('NOTHING', 'queue empty')
      return
    }

    await logInfo('START', `mode:${MODE}`, `queue:${queue.length}`, `processing:${subset.length}`, `limit:${LIMIT || 'all'}`)

    // Загружаем product_id из БД для всех external_id из subset
    const extIds = subset.map(x => x.external_id)
    const products = await sql`select id, external_id, name from products where external_id in ${sql(extIds)} and source=${SOURCE}`
    const byExt = new Map(products.map(p => [p.external_id, p]))
    await logInfo('DB_MATCH', `${products.length}/${subset.length} products found in DB`)

    let processed = 0
    let skipped = 0
    let failed = 0
    let totalImages = 0

    for (let i = 0; i < subset.length; i++) {
      const item = subset[i]
      const idx = `[${i + 1}/${subset.length}]`
      const p = byExt.get(item.external_id)

      if (!p) {
        await logWarn('SKIP_NOT_IN_DB', idx, item.external_id, item.name?.substring(0, 60))
        skipped++
        continue
      }

      // Фильтруем URL
      const urls = filterImageUrls(item.image_urls || [])
      if (!urls.length) {
        await logWarn('NO_IMAGES', idx, item.external_id, item.name?.substring(0, 60), 'after-filter:0')
        skipped++
        continue
      }

      // В режиме missing — проверяем, есть ли уже fetch-картинки
      if (MODE === 'missing') {
        const existing = await sql`select id from product_images where product_id=${p.id} and source='fetch' limit 1`
        if (existing.length) {
          await logInfo('SKIP_EXISTS', idx, item.external_id, item.name?.substring(0, 60), `fetch-images:${existing.length}`)
          skipped++
          continue
        }
      }

      try {
        const rows = []
        let pos = 1
        for (const imgUrl of urls) {
          try {
            const row = await prepareImage(p.id, imgUrl, pos)
            rows.push(row)
            pos++
          } catch (e) {
            await logError('IMG_FAIL', idx, imgUrl, e.message)
          }
        }

        if (!rows.length) {
          await logError('ALL_IMG_FAIL', idx, item.external_id, item.name?.substring(0, 60))
          failed++
          continue
        }

        const deleted = MODE === 'full' ? await replaceProductImages(p.id, rows) : (await saveMissingImages(rows), 0)
        const originalKb = kb(sum(rows, 'originalSize'))
        const finalKb = kb(sum(rows, 'finalSize'))
        const optimizedCount = rows.filter(r => r.optimized).length

        totalImages += rows.length
        processed++
        await logSuccess('OK', idx, item.external_id, item.name?.substring(0, 60), `imgs:${rows.length}/${urls.length}`, `size:${originalKb}KB->${finalKb}KB`, `optimized:${optimizedCount}`, `replaced:${deleted}`)
      } catch (e) {
        failed++
        await logError('ERROR', idx, item.external_id, item.name?.substring(0, 60), e.message)
      }
    }

    await logInfo('DONE', `processed:${processed}`, `skipped:${skipped}`, `failed:${failed}`, `total_images:${totalImages}`)
  } catch (e) {
    await logError('FATAL', e.stack || e.message)
    process.exitCode = 1
  } finally {
    await sql.end()
  }
}

main()
