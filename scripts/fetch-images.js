import 'dotenv/config'
import puppeteer from 'puppeteer'
import postgres from 'postgres'
import sharp from 'sharp'
import brands from './brands.json' with { type: 'json' }
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import fs from 'fs-extra'
import path from 'path'
import { v4 as uuid } from 'uuid'
const MODES = {
	MISSING: 'missing',
	FULL: 'full'
}
// MODE:
// 'missing' — обработать только товары без fetch-картинок.
// 'full' — обработать все товары и заменить старые fetch-картинки новыми.
// Бренды в обоих режимах берутся из scripts/brands.json.
const MODE = MODES.FULL
const THREADS = 3
const HEADLESS = true
const BASE = 'https://tetrasis-bt.ru'
const LOG = path.resolve('scripts/fetch-images.log')
const ERROR_LOG = path.resolve('scripts/fetch-images-errors.log')
const ACTION_DELAY = 900
const IMAGE_DELAY = 250
const RETRIES = 3
const RETRY_DELAY = 3000
const JPEG_QUALITY = 78
const MAX_SIZE = 1600
const MIN_ORIGINAL_SIZE_KB = 120
const progress = { total: 0, done: 0 }
const colors = {
	green: '\x1b[32m',
	red: '\x1b[31m',
	yellow: '\x1b[33m',
	blue: '\x1b[36m',
	gray: '\x1b[90m',
	reset: '\x1b[0m'
}
if (!Object.values(MODES).includes(MODE)) throw new Error(`Unknown MODE: ${MODE}. Use: ${Object.values(MODES).join(', ')}`)
const sql = postgres({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 5432), database: process.env.DB_NAME, username: process.env.DB_USER, password: process.env.DB_PASSWORD })
const s3 = new S3Client({ region: 'reg', endpoint: process.env.S3_ENDPOINT, credentials: { accessKeyId: process.env.S3_ACCESS_KEY, secretAccessKey: process.env.S3_SECRET_KEY }, forcePathStyle: true })
const BUCKET = process.env.S3_BUCKET
const S3_PUBLIC_PREFIX = `${process.env.S3_ENDPOINT.replace(/\/$/, '')}/${BUCKET}/`
const sleep = ms => new Promise(r => setTimeout(r, ms))
const delay = () => sleep(ACTION_DELAY)
const now = () => new Date().toISOString()
function stripAnsi(value) { return String(value).replace(/\x1b\[[0-9;]*m/g, '') }
async function writeLog(line) { console.log(line); await fs.appendFile(LOG, stripAnsi(line) + '\n') }
async function writeErrorLog(...a) { await fs.appendFile(ERROR_LOG, `${now()} ${a.join(' ')}\n`) }
async function logInfo(...a) { await writeLog(`${colors.gray}${now()}${colors.reset} ${colors.blue}${a.join(' ')}${colors.reset}`) }
async function logSuccess(...a) { await writeLog(`${colors.gray}${now()}${colors.reset} ${colors.green}${a.join(' ')}${colors.reset}`) }
async function logWarn(...a) { await writeLog(`${colors.gray}${now()}${colors.reset} ${colors.yellow}${a.join(' ')}${colors.reset}`) }
async function logError(...a) { await writeLog(`${colors.gray}${now()}${colors.reset} ${colors.red}${a.join(' ')}${colors.reset}`) }
async function withRetry(label, fn, retries = RETRIES) {
	let lastError
	for (let attempt = 1; attempt <= retries; attempt++) {
		try { return await fn(attempt) }
		catch (e) {
			lastError = e
			if (attempt < retries) {
				await logWarn('RETRY', label, `attempt:${attempt}/${retries}`, e.message)
				await sleep(RETRY_DELAY * attempt)
			}
		}
	}
	throw lastError
}
function progressText(p) {
	const current = progress.done + 1
	const percent = progress.total ? Math.round((current / progress.total) * 100) : 100
	return `[${current}/${progress.total} ${percent}%] ${p.name}`
}
function cleanName(value) { return String(value || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]+/gi, ' ').trim() }
function brand(name) { return String(name || '').split(' ')[0].toLowerCase() }
function normalizeName(value) { return String(value || '').toLowerCase().replace(/ё/g, 'е').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ') }
function normalizeBrand(value) { return String(value || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]+/gi, ' ').trim() }
function allowedBrands() { return brands.map(b => normalizeBrand(b.name)).filter(Boolean) }
function productSlugVariants(name) {
	const base = cleanName(name)
	const variants = [base]
	if (!/\d$/.test(base)) variants.push(`${base}1`)
	if (/\sg$/.test(base)) variants.push(base.replace(/\sg$/, ' b'))
	const result = []
	for (const value of variants) {
		result.push(value.replace(/\s+/g, '_'))
		result.push(value.replace(/\s+/g, '-'))
	}
	return [...new Set(result)]
}
function isNoImageUrl(url) { return /no[-_]?image|no_photo|nophoto|placeholder|zaglush/i.test(String(url || '')) }
function s3KeyFromUrl(url) {
	if (!url?.startsWith(S3_PUBLIC_PREFIX)) return null
	return decodeURIComponent(url.slice(S3_PUBLIC_PREFIX.length))
}
function kb(bytes) { return Math.round(bytes / 1024) }
function sum(rows, key) { return rows.reduce((acc, row) => acc + (row[key] || 0), 0) }
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
async function goto(page, url) {
	return await withRetry(`goto:${url}`, async () => {
		await delay()
		await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
		await sleep(700)
	})
}
async function hasNoImage(page) {
	return await withRetry('has-no-image', async () => {
		return await page.evaluate(() => {
			const selectors = ['.item_slider img', '.product-detail-gallery img', '.detail_picture img', '.slides img', '.product-item-detail-slider img', 'img.detail_picture', 'img.product-detail-image']
			const nodes = selectors.flatMap(selector => [...document.querySelectorAll(selector)])
			return nodes.some(node => {
				const src = node.getAttribute('src') || ''
				const dataSrc = node.getAttribute('data-src') || ''
				const alt = node.getAttribute('alt') || ''
				const cls = node.getAttribute('class') || ''
				return /no[-_]?image|no_photo|nophoto|placeholder|zaglush/i.test(src + ' ' + dataSrc + ' ' + alt + ' ' + cls)
			})
		})
	})
}
async function getImages(page, url) {
	return await withRetry(`images:${url}`, async () => {
		await goto(page, url)
		if (await hasNoImage(page)) return { images: [], status: 'no-image' }
		const images = await page.evaluate(() => {
			const urls = []
			const push = value => {
				if (!value) return
				const url = new URL(value, location.origin).href
				if (!urls.includes(url)) urls.push(url)
			}
			const selectors = [
				'.item_slider ul li[id^="photo-"] a.popup_link[href]',
				'.item_slider a.popup_link[href]',
				'.product-detail-gallery a.popup_link[href]',
				'.detail_picture a.popup_link[href]',
				'.slides a.popup_link[href]',
				'a.popup_link[href][data-fancybox]',
				'a.popup_link[href][rel]'
			]
			selectors.forEach(selector => document.querySelectorAll(selector).forEach(a => push(a.getAttribute('href'))))
			if (!urls.length) {
				const imgSelectors = ['.item_slider img[src]', '.product-detail-gallery img[src]', '.detail_picture img[src]', '.slides img[src]', 'img.detail_picture[src]', 'img.product-detail-image[src]']
				imgSelectors.forEach(selector => document.querySelectorAll(selector).forEach(img => push(img.getAttribute('data-src') || img.getAttribute('src'))))
			}
			return urls
		})
		const filtered = images.filter(url => !isNoImageUrl(url) && /\.(jpe?g|png|webp)(\?|$)/i.test(url))
		return { images: filtered, status: filtered.length ? 'ok' : 'empty' }
	})
}
async function resolveDirect(page, name) {
	return await withRetry(`direct:${name}`, async () => {
		for (const s of productSlugVariants(name)) {
			const url = `${BASE}/product/${s}/`
			await goto(page, url)
			if (await hasNoImage(page)) return { url: null, status: 'no-image', tried: url }
			const hasProductImage = await page.evaluate(() => {
				return Boolean(document.querySelector('.item_slider a.popup_link[href],.product-detail-gallery a.popup_link[href],.detail_picture a.popup_link[href],.slides a.popup_link[href],img.detail_picture[src],img.product-detail-image[src]'))
			})
			if (hasProductImage) return { url, status: 'ok', tried: url }
		}
		return { url: null, status: 'not-found', tried: productSlugVariants(name).join(', ') }
	})
}
async function resolveSearch(page, name) {
	return await withRetry(`search:${name}`, async () => {
		const searchUrl = BASE + '/search/?q=' + encodeURIComponent(name)
		await goto(page, searchUrl)
		await page.waitForSelector('.catalog-item a,.item-title a,a[href*="/product/"]', { timeout: 7000 }).catch(() => null)
		const result = await page.evaluate(name => {
			const normalizeName = value => String(value || '').toLowerCase().replace(/ё/g, 'е').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ')
			const target = normalizeName(name)
			const cards = [...document.querySelectorAll('.catalog-item,.item')]
			const items = cards.length ? cards.map(card => {
				const link = card.querySelector('.item-title a,a.item-title,a[href*="/product/"],a')
				const titleNode = card.querySelector('.item-title,a.item-title,.name,.title,a[href*="/product/"]')
				const title = titleNode?.textContent || link?.textContent || ''
				const href = link?.getAttribute('href') || ''
				return { title, href }
			}) : [...document.querySelectorAll('.catalog-item a,.item-title a,a[href*="/product/"]')].map(a => ({ title: a.textContent || '', href: a.getAttribute('href') || '' }))
			const exact = items.find(item => {
				const title = normalizeName(item.title)
				return title === target || title.startsWith(target + ' ')
			})
			if (!exact) return null
			return exact.href ? { title: exact.title, href: exact.href } : null
		}, name)
		if (!result?.href) return { url: null, status: 'not-found' }
		const full = result.href.startsWith('http') ? result.href : BASE + result.href
		return { url: full, status: 'ok', title: result.title }
	})
}
async function prepareImage(p, imgUrl, pos) {
	const b = brand(p.name)
	const id = uuid()
	const key = `products/${b}/${id}.jpg`
	const original = await download(imgUrl)
	const originalSize = original.length
	const shouldOptimize = kb(originalSize) >= MIN_ORIGINAL_SIZE_KB
	const finalBuffer = shouldOptimize ? await optimizeImage(original) : original
	const finalSize = finalBuffer.length
	const s3Url = await uploadToS3(finalBuffer, key)
	return { id, product_id: p.id, url: s3Url, source: 'fetch', source_url: imgUrl, position: pos, originalSize, finalSize, optimized: shouldOptimize }
}
async function saveMissingImages(rows) {
	for (const row of rows) await sql`insert into product_images(id,product_id,url,source,source_url,position) values(${row.id},${row.product_id},${row.url},${row.source},${row.source_url},${row.position})`
}
async function replaceProductImages(p, rows) {
	const oldRows = await sql`select url from product_images where product_id=${p.id} and source='fetch'`
	await sql.begin(async tx => {
		await tx`delete from product_images where product_id=${p.id} and source='fetch'`
		for (const row of rows) await tx`insert into product_images(id,product_id,url,source,source_url,position) values(${row.id},${row.product_id},${row.url},${row.source},${row.source_url},${row.position})`
	})
	let deleted = 0
	for (const old of oldRows) {
		const key = s3KeyFromUrl(old.url)
		if (!key) continue
		try { await deleteFromS3(key); deleted++ }
		catch (e) { await logWarn('DELETE OLD ERROR', old.url, e.message); await writeErrorLog('DELETE_OLD_ERROR', p.name, old.url, e.message) }
	}
	return deleted
}
async function processProduct(page, p) {
	const label = progressText(p)
	let stage = 'direct'
	let direct, search, url, images = []
	try {
		direct = await resolveDirect(page, p.name)
		if (direct.url) url = direct.url
		if (!url) {
			stage = 'search'
			search = await resolveSearch(page, p.name)
			if (search.url) url = search.url
		}
		if (!url) {
			if (direct?.status === 'no-image') {
				await logInfo('NO IMAGE', label, `stage:${stage}`, `direct:${direct.status}`, `search:${search?.status || 'not-used'}`)
				await writeErrorLog('NO_IMAGE', p.name, `direct:${direct.status}`, `search:${search?.status || 'not-used'}`)
			} else {
				await logError('NOT FOUND', label, `stage:${stage}`, `direct:${direct?.status || 'fail'}`, `search:${search?.status || 'not-used'}`)
				await writeErrorLog('NOT_FOUND', p.name, `stage:${stage}`, `direct:${direct?.status || 'fail'}`, `search:${search?.status || 'not-used'}`)
			}
			return
		}
		stage = 'images'
		const imageResult = await getImages(page, url)
		images = imageResult.images
		if (!images.length) {
			if (imageResult.status === 'no-image') {
				await logInfo('NO IMAGE', label, 'stage:images', `reason:${imageResult.status}`, `url:${url}`)
				await writeErrorLog('NO_IMAGE', p.name, `stage:images`, `url:${url}`)
			} else {
				await logError('NO IMAGES FOUND', label, 'stage:images', `reason:${imageResult.status}`, `url:${url}`)
				await writeErrorLog('NO_IMAGES_FOUND', p.name, `stage:images`, `reason:${imageResult.status}`, `url:${url}`)
			}
			return
		}
		stage = 'prepare'
		const existing = MODE === MODES.MISSING ? await sql`select source_url,url from product_images where product_id=${p.id} and source='fetch'` : []
		const map = new Map(existing.map(x => [x.source_url, x.url]))
		const rows = []
		let pos = 1, skipCount = 0
		for (const imgUrl of images) {
			if (MODE === MODES.MISSING && map.has(imgUrl)) { skipCount++; pos++; continue }
			const row = await prepareImage(p, imgUrl, pos)
			rows.push(row)
			pos++; await sleep(IMAGE_DELAY)
		}
		if (!rows.length) {
			await logWarn('SKIP', label, `imgs:${images.length}`, `skip:${skipCount}`, 'reason:already-exists')
			await writeErrorLog('SKIP_ALREADY_EXISTS', p.name, `imgs:${images.length}`, `skip:${skipCount}`)
			return
		}
		stage = MODE === MODES.FULL ? 'replace' : 'insert'
		const deleted = MODE === MODES.FULL ? await replaceProductImages(p, rows) : (await saveMissingImages(rows), 0)
		const originalKb = kb(sum(rows, 'originalSize'))
		const finalKb = kb(sum(rows, 'finalSize'))
		const optimizedCount = rows.filter(row => row.optimized).length
		const originalCount = rows.length - optimizedCount
		const source = direct?.url ? 'direct' : 'search'
		await logSuccess('OK', label, `source:${source}`, `imgs:${rows.length}`, `size:${originalKb}KB -> ${finalKb}KB`, `optimized:${optimizedCount}`, `original:${originalCount}`, `replaced:${deleted}`, `skip:${skipCount}`)
	} catch (e) {
		await logError('ERROR', label, `stage:${stage}`, e.message)
		await writeErrorLog('ERROR', p.name, `stage:${stage}`, e.message)
	}
}
async function worker(browser, queue) {
	const page = await browser.newPage()
	await page.setViewport({ width: 1440, height: 1000 })
	while (true) {
		const p = queue.shift()
		if (!p) break
		await processProduct(page, p)
		progress.done++
	}
	await page.close()
}
async function main() {
	await fs.writeFile(LOG, '')
	await fs.writeFile(ERROR_LOG, '')
	const selectedBrands = allowedBrands()
	if (!selectedBrands.length) throw new Error('brands.json is empty')
	await logInfo('BRANDS', selectedBrands.join(', '))
	const browser = await puppeteer.launch({ headless: HEADLESS, defaultViewport: null, args: ['--no-sandbox', '--disable-setuid-sandbox'] })
	let products
	if (MODE === MODES.MISSING) {
		products = await sql`
			select p.id,p.name from products p
			where not exists(select 1 from product_images pi where pi.product_id=p.id and pi.source='fetch')
				and lower(trim(p.brand->>'name')) in ${sql(selectedBrands)}
			order by p.name
		`
	} else if (MODE === MODES.FULL) {
		products = await sql`
			select id,name from products
			where lower(trim(brand->>'name')) in ${sql(selectedBrands)}
			order by name
		`
	}
	progress.total = products.length
	progress.done = 0
	await logInfo('TOTAL', products.length)
	const queue = [...products]
	const workers = []
	for (let i = 0; i < THREADS; i++) workers.push(worker(browser, queue))
	await Promise.all(workers)
	await browser.close()
	await sql.end()
	await logInfo('FINISHED')
}
export async function deleteImage(url) {
	const key = s3KeyFromUrl(url)
	if (!key) return
	await deleteFromS3(key)
}
main()