// # Пережать картинки в S3 через sharp: jpeg/png → webp q80, ширина ≤ 1600px
// Пишет webp в ТОТ ЖЕ ключ (Content-Type меняется на image/webp), помечает объект
// метаданными recompressed=webp80 — повторный запуск пропускает уже сжатое.
//
// # Запуск (нужен туннель к БД или запуск с прода):
// RECOMPRESS_THREADS=4 caffeinate -dims node scripts/recompress-s3-images/recompress.js
//
// # Только посчитать, ничего не менять:
// RECOMPRESS_DRY_RUN=1 node scripts/recompress-s3-images/recompress.js

import 'dotenv/config'
import postgres from 'postgres'
import sharp from 'sharp'
import { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import fs from 'fs-extra'

const THREADS = Number(process.env.RECOMPRESS_THREADS || 4)
const MAX_WIDTH = Number(process.env.RECOMPRESS_MAX_WIDTH || 1600)
const QUALITY = Number(process.env.RECOMPRESS_QUALITY || 80)
const DRY_RUN = process.env.RECOMPRESS_DRY_RUN === '1'
const LOG = 'scripts/recompress-s3-images/recompress.log'
const FAILED = 'scripts/recompress-s3-images/failed.json'

const BUCKET = process.env.S3_BUCKET
const PREFIX = `${process.env.S3_ENDPOINT.replace(/\/$/, '')}/${BUCKET}/`
if (!BUCKET) throw new Error('S3_BUCKET missing')

const sql = postgres({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 5432), database: process.env.DB_NAME, username: process.env.DB_USER, password: process.env.DB_PASSWORD })
const s3 = new S3Client({ region: 'reg', endpoint: process.env.S3_ENDPOINT, credentials: { accessKeyId: process.env.S3_ACCESS_KEY, secretAccessKey: process.env.S3_SECRET_KEY }, forcePathStyle: true })

const now = () => new Date().toISOString()
async function log(...a) {
	const line = `${now()} ${a.join(' ')}`
	console.log(line)
	await fs.appendFile(LOG, line + '\n')
}
const sleep = ms => new Promise(r => setTimeout(r, ms))
const fmtMb = b => (b / 1024 / 1024).toFixed(1) + 'MB'

function keyFromUrl(url) {
	if (!url || !url.startsWith(PREFIX)) return null
	const key = decodeURIComponent(url.slice(PREFIX.length).split('?')[0])
	// служебные варианты прокси не трогаем
	if (key.startsWith('__rs/')) return null
	return key || null
}

async function collectUrls() {
	const set = new Set()
	const imgs = await sql`select url from product_images`
	for (const r of imgs) set.add(r.url)
	try {
		const arts = await sql`select cover_url as url from articles where cover_url is not null`
		for (const r of arts) set.add(r.url)
	} catch {}
	return [...set].map(keyFromUrl).filter(Boolean)
}

async function head(key) {
	try {
		const res = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }))
		return res
	} catch (e) {
		if (e?.$metadata?.httpStatusCode === 404 || e?.name === 'NotFound' || e?.name === 'NoSuchKey') return null
		throw e
	}
}

async function recompress(key) {
	const info = await head(key)
	if (!info) return 'missing'
	if (info.ContentType === 'image/webp' || info.Metadata?.recompressed) return 'skipped'
	const orig = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
	const buf = Buffer.from(await orig.Body.transformToByteArray())
	const meta = await sharp(buf).metadata()
	if (!['jpeg', 'jpg', 'png'].includes(meta.format)) return 'skipped'
	if (DRY_RUN) return 'would'
	const out = await sharp(buf)
		.resize({ width: MAX_WIDTH, withoutEnlargement: true })
		.webp({ quality: QUALITY })
		.toBuffer()
	await s3.send(new PutObjectCommand({
		Bucket: BUCKET,
		Key: key,
		Body: out,
		ACL: 'public-read',
		ContentType: 'image/webp',
		CacheControl: 'public, max-age=31536000, immutable',
		Metadata: { recompressed: 'webp80' }
	}))
	return { before: buf.length, after: out.length }
}

async function main() {
	await fs.writeFile(LOG, '')
	const t0 = Date.now()
	const keys = await collectUrls()
	await log('START', `${keys.length} картинок`, DRY_RUN ? '(dry-run)' : '', `threads=${THREADS}`)
	const stats = { done: 0, skipped: 0, missing: 0, failed: 0, bytesBefore: 0, bytesAfter: 0 }
	const failedKeys = []
	let cursor = 0
	async function worker() {
		while (cursor < keys.length) {
			const key = keys[cursor++]
			try {
				const res = await recompress(key)
				if (res === 'skipped') stats.skipped++
				else if (res === 'missing') stats.missing++
				else if (res === 'would') stats.done++
				else {
					stats.done++
					stats.bytesBefore += res.before
					stats.bytesAfter += res.after
				}
			} catch (e) {
				stats.failed++
				failedKeys.push({ key, error: String(e?.message || e) })
				await log('FAILED', key, e?.message || e)
			}
			const n = stats.done + stats.skipped + stats.missing + stats.failed
			if (n % 100 === 0) {
				await log('PROGRESS', `${n}/${keys.length}`, `saved ${fmtMb(stats.bytesBefore - stats.bytesAfter)}`)
			}
		}
	}
	await Promise.all(Array.from({ length: THREADS }, worker))
	await log('DONE', JSON.stringify({
		...stats,
		savedBytes: stats.bytesBefore - stats.bytesAfter,
		saved: fmtMb(stats.bytesBefore - stats.bytesAfter),
		sec: Math.round((Date.now() - t0) / 1000)
	}))
	if (failedKeys.length) await fs.writeJson(FAILED, failedKeys, { spaces: 2 })
	await sql.end()
}

main().catch(async e => {
	await log('FATAL', e.stack || e.message).catch(() => null)
	await sql.end().catch(() => null)
	process.exit(1)
})
