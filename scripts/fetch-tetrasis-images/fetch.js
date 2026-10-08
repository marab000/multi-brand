import 'dotenv/config'
import puppeteer from 'puppeteer'
import postgres from 'postgres'
import sharp from 'sharp'
import brands from '../sync-tetrasis-products/brands.json' with { type: 'json' }
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import fs from 'fs-extra'
import path from 'path'
import { v4 as uuid } from 'uuid'
// не удалять!!
// MODE:
// 'missing' — обработать только товары без fetch-картинок.
// 'full' — обработать все товары и заменить старые fetch-картинки новыми.
// SOURCE:
// 'db' — взять товары из базы.
// 'queue' — взять товары из scripts/fetch-tetrasis-images/image-queue.json.
const MODES = { MISSING: 'missing', FULL: 'full' }
const SOURCES = { DB: 'db', QUEUE: 'queue' }
const ROOT = 'scripts/fetch-tetrasis-images'
const MODE = process.env.FETCH_IMAGES_MODE || MODES.FULL
const SOURCE = process.env.FETCH_IMAGES_SOURCE || SOURCES.DB
const THREADS = Number(process.env.FETCH_IMAGES_THREADS || 2)
const PAGE_RECYCLE = Number(process.env.FETCH_IMAGES_PAGE_RECYCLE || 100)
const HEADLESS = process.env.FETCH_IMAGES_HEADLESS !== 'false'
const BASE = 'https://tetrasis-bt.ru'
const LOG = path.resolve(`${ROOT}/fetch-images.log`)
const QUEUE_FILE = path.resolve(process.env.FETCH_IMAGES_QUEUE || `${ROOT}/image-queue.json`)
const ACTION_DELAY = Number(process.env.FETCH_IMAGES_ACTION_DELAY || 700)
const SEARCH_DELAY = Number(process.env.FETCH_IMAGES_SEARCH_DELAY || 1200)
const PRODUCT_DELAY = Number(process.env.FETCH_IMAGES_PRODUCT_DELAY || 500)
const IMAGE_DELAY = Number(process.env.FETCH_IMAGES_IMAGE_DELAY || 200)
const RETRIES = Number(process.env.FETCH_IMAGES_RETRIES || 3)
const RETRY_DELAY = Number(process.env.FETCH_IMAGES_RETRY_DELAY || 3000)
const JPEG_QUALITY = Number(process.env.FETCH_IMAGES_JPEG_QUALITY || 78)
const MAX_SIZE = Number(process.env.FETCH_IMAGES_MAX_SIZE || 1600)
const MIN_ORIGINAL_SIZE_KB = Number(process.env.FETCH_IMAGES_MIN_ORIGINAL_SIZE_KB || 120)
const SEARCH_MIN_SCORE = Number(process.env.FETCH_IMAGES_SEARCH_MIN_SCORE || 0.72)
if (!Object.values(MODES).includes(MODE)) throw new Error(`Unknown FETCH_IMAGES_MODE: ${MODE}. Use: ${Object.values(MODES).join(', ')}`)
if (!Object.values(SOURCES).includes(SOURCE)) throw new Error(`Unknown FETCH_IMAGES_SOURCE: ${SOURCE}. Use: ${Object.values(SOURCES).join(', ')}`)
const sql = postgres({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 5432), database: process.env.DB_NAME, username: process.env.DB_USER, password: process.env.DB_PASSWORD })
const s3 = new S3Client({ region: 'reg', endpoint: process.env.S3_ENDPOINT, credentials: { accessKeyId: process.env.S3_ACCESS_KEY, secretAccessKey: process.env.S3_SECRET_KEY }, forcePathStyle: true })
const BUCKET = process.env.S3_BUCKET
const S3_PUBLIC_PREFIX = `${process.env.S3_ENDPOINT.replace(/\/$/, '')}/${BUCKET}/`
const progress = { total: 0, done: 0 }
const failedQueue = []
const colors = { green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', blue: '\x1b[36m', gray: '\x1b[90m', reset: '\x1b[0m' }
const sleep = ms => new Promise(r => setTimeout(r, ms))
const delay = (ms = ACTION_DELAY) => sleep(ms)
const now = () => new Date().toISOString()
// Статус прогона пишется в settings.tetrasis_images_state — админка (Тетрис →
// «Синхронизация картинок») читает тот же ключ через src/lib/server/tetrasisImages.ts.
// Порог свежести heartbeat (15 мин) должен совпадать с STALE_RUNNING_MS там же.
const IMAGES_STATE_KEY = 'tetrasis_images_state'
const STATE_STALE_MS = 15 * 60 * 1000
const STATE_FLUSH_MS = 120 * 1000
const RUN_SOURCE = process.env.FETCH_IMAGES_RUN_SOURCE === 'admin' ? 'admin' : 'cli'
const runState = { status: 'running', mode: MODE, source: RUN_SOURCE, startedAt: now(), updatedAt: now(), finishedAt: null, error: null, total: 0, done: 0, ok: 0, notFound: 0, noImage: 0, errors: 0, current: null }
async function flushState() {
	runState.done = progress.done
	runState.updatedAt = now()
	try {
		const json = JSON.stringify(runState)
		await sql`insert into settings (key, value, updated_at) values (${IMAGES_STATE_KEY}, ${json}, now()) on conflict (key) do update set value = ${json}, updated_at = now()`
	} catch {}
}
let lastStateFlush = 0
async function flushStateThrottled() {
	if (Date.now() - lastStateFlush < STATE_FLUSH_MS) return
	lastStateFlush = Date.now()
	await flushState()
}
const ruMap = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' }
function stripAnsi(value) { return String(value).replace(/\x1b\[[0-9;]*m/g, '') }
async function writeLog(line) { console.log(line); await fs.appendFile(LOG, stripAnsi(line) + '\n') }
async function logLine(color, ...a) { await writeLog(`${colors.gray}${now()}${colors.reset} ${color}${a.join(' ')}${colors.reset}`) }
async function logInfo(...a) { await logLine(colors.blue, ...a) }
async function logSuccess(...a) { await logLine(colors.green, ...a) }
async function logWarn(...a) { await logLine(colors.yellow, ...a) }
async function logError(...a) { await logLine(colors.red, ...a) }
async function withRetry(label, fn, retries = RETRIES) {
	let lastError
	for (let attempt = 1; attempt <= retries; attempt++) {
		try { return await fn(attempt) }
		catch (e) {
			lastError = e
			if (attempt < retries) await sleep(RETRY_DELAY * attempt)
		}
	}
	throw lastError
}
function progressText(p) {
	const current = progress.done + 1
	const percent = progress.total ? Math.round((current / progress.total) * 100) : 100
	return `[${current}/${progress.total} ${percent}%] ${p.name}`
}
function removeDiacritics(value) { return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '') }
function translit(value) { return removeDiacritics(String(value || '').toLowerCase()).replace(/ё/g, 'е').replace(/[а-я]/g, ch => ruMap[ch] ?? ch) }
function cleanName(value) { return translit(value).replace(/[^a-z0-9]+/gi, ' ').trim() }
function brand(name) { return cleanName(name).split(' ')[0] || String(name || '').split(' ')[0].toLowerCase() }
function normalizeName(value) { return translit(value).replace(/[^a-z0-9]+/gi, ' ').trim().replace(/\s+/g, ' ') }
function compactName(value) { return normalizeName(value).replace(/\s+/g, '') }
function normalizeBrand(value) { return normalizeName(value) }
function allowedBrands() { return brands.map(b => normalizeBrand(b)).filter(Boolean) }
function addVariant(list, value) {
	const v = cleanName(value)
	if (v) list.push(v)
}
function productSlugVariants(name) {
	const base = cleanName(name)
	const parts = base.split(' ')
	const brandPart = parts[0]
	const modelParts = parts.slice(1)
	const model = modelParts.join(' ')
	const compactModel = modelParts.join('')
	const variants = []
	addVariant(variants, base)
	if (brandPart && compactModel) addVariant(variants, `${brandPart} ${compactModel}`)
	if (!/\d$/.test(base)) addVariant(variants, `${base}1`)
	if (brandPart && compactModel && !/\d$/.test(compactModel)) addVariant(variants, `${brandPart} ${compactModel}1`)
	if (/\sg$/.test(base)) addVariant(variants, base.replace(/\sg$/, ' b'))
	const compactMatch = model.match(/^([a-z]+)(\d+)([a-z]+)$/i)
	if (brandPart && compactMatch) {
		const [, prefix, digits, suffix] = compactMatch
		addVariant(variants, `${brandPart} ${prefix} ${digits} ${suffix}`)
	}
	const prefixDigitsMatch = model.match(/^([a-z]+)(\d+)$/i)
	if (brandPart && prefixDigitsMatch) {
		const [, prefix, digits] = prefixDigitsMatch
		addVariant(variants, `${brandPart} ${prefix} ${digits}`)
	}
	const lastNumberMatch = base.match(/^(.*?)(\d+)$/)
	if (lastNumberMatch) addVariant(variants, `${lastNumberMatch[1]}${lastNumberMatch[2]}1`)
	const result = []
	for (const value of [...new Set(variants)]) {
		result.push(value.replace(/\s+/g, '_'))
		result.push(value.replace(/\s+/g, '-'))
	}
	return [...new Set(result)]
}
function searchQueries(name) {
	const normalized = normalizeName(name)
	const parts = normalized.split(' ').filter(Boolean)
	const brandPart = parts[0] || ''
	const model = parts.slice(1).join(' ')
	const compactModel = parts.slice(1).join('')
	const queries = [name, normalized]
	if (brandPart && model) queries.push(`${brandPart} ${model}`)
	if (brandPart && compactModel) queries.push(`${brandPart} ${compactModel}`)
	if (model) queries.push(model)
	return [...new Set(queries.map(q => String(q || '').trim()).filter(Boolean))]
}
function isNoImageUrl(url) { return /no[-_]?image|no_photo|nophoto|placeholder|zaglush|bez[-_]?imeni/i.test(String(url || '')) }
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
async function goto(page, url, wait = ACTION_DELAY) {
	return await withRetry(`goto:${url}`, async () => {
		await delay(wait)
		const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
		await sleep(wait)
		return { response, status: response?.status() || 0 }
	})
}
async function isProductPage(page) {
	return await withRetry('is-product-page', async () => {
		return await page.evaluate(() => {
			const title = document.title || ''
			const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || ''
			const text = document.body?.innerText || ''
			if (/страница не найдена|элемент не найден|товар не найден|раздел не найден|404/i.test(`${title} ${ogTitle} ${text}`)) return false
			const h1 = document.querySelector('h1')?.textContent?.trim()
			if (!h1) return false
			return Boolean(document.querySelector('.item_slider,.product-detail-gallery,.detail_picture,.product-item-detail-slider,img.detail_picture,img.product-detail-image,img.xzoom-gallery'))
		})
	})
}
async function hasNoImage(page) {
	return await withRetry('has-no-image', async () => {
		return await page.evaluate(() => {
			const selectors = ['.item_slider img', '.product-detail-gallery img', '.detail_picture img', '.slides img', '.product-item-detail-slider img', 'img.detail_picture', 'img.product-detail-image', 'img.xzoom-gallery']
			const nodes = selectors.flatMap(selector => [...document.querySelectorAll(selector)])
			return nodes.some(node => {
				const src = node.getAttribute('src') || ''
				const dataSrc = node.getAttribute('data-src') || ''
				const dataXpreview = node.getAttribute('data-xpreview') || ''
				const xoriginal = node.getAttribute('xoriginal') || ''
				const alt = node.getAttribute('alt') || ''
				const cls = node.getAttribute('class') || ''
				return /no[-_]?image|no_photo|nophoto|placeholder|zaglush|bez[-_]?imeni/i.test(src + ' ' + dataSrc + ' ' + dataXpreview + ' ' + xoriginal + ' ' + alt + ' ' + cls)
			})
		})
	})
}
async function getImages(page, url) {
	return await withRetry(`images:${url}`, async () => {
		const { status } = await goto(page, url)
		if (status === 404) return { images: [], rawCount: 0, status: 'not-found' }
		if (!(await isProductPage(page))) return { images: [], rawCount: 0, status: 'not-found' }
		const images = await page.evaluate(() => {
			const urls = []
			const push = value => {
				if (!value) return
				const url = new URL(value, location.origin).href
				if (!urls.includes(url)) urls.push(url)
			}
			const attrSelectors = [
				['.item_slider .thumbs li[data-big_img]', 'data-big_img'],
				['.item_slider .thumbs li[data-small_img]', 'data-small_img'],
				['.item_slider li[data-big_img]', 'data-big_img'],
				['.item_slider li[data-small_img]', 'data-small_img'],
				['.item_slider img[xoriginal]', 'xoriginal'],
				['.item_slider img[data-xpreview]', 'data-xpreview'],
				['.item_slider img[data-src]', 'data-src'],
				['.item_slider a.popup_link[href]', 'href'],
				['.product-detail-gallery a.popup_link[href]', 'href'],
				['.detail_picture a.popup_link[href]', 'href'],
				['.slides a.popup_link[href]', 'href']
			]
			attrSelectors.forEach(([selector, attr]) => document.querySelectorAll(selector).forEach(node => push(node.getAttribute(attr))))
			if (!urls.length) {
				const imgSelectors = ['.item_slider img[src]', '.product-detail-gallery img[src]', '.detail_picture img[src]', '.slides img[src]', 'img.detail_picture[src]', 'img.product-detail-image[src]', 'img.xzoom-gallery[src]']
				imgSelectors.forEach(selector => document.querySelectorAll(selector).forEach(img => push(img.getAttribute('src'))))
			}
			return urls
		})
		const filtered = images.filter(url => !isNoImageUrl(url) && /\.(jpe?g|png|webp)(\?|$)/i.test(url))
		if (!filtered.length && await hasNoImage(page)) return { images: [], rawCount: images.length, status: 'no-image' }
		return { images: filtered, rawCount: images.length, status: filtered.length ? 'ok' : 'empty' }
	})
}
async function httpProbe(url) {
	try {
		const r = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20000) })
		return { status: r.status, finalUrl: r.url || url }
	} catch { return { status: 0, finalUrl: url } }
}

// H1/тайтл открытой страницы должен содержать артикул модели — защита от похожего товара
async function pageMatchesModel(page, modelToken) {
	if (!modelToken) return true
	const text = await page.evaluate(() => (document.querySelector('h1')?.textContent || '') + ' ' + (document.title || ''))
	return compactName(text).includes(modelToken)
}

async function resolveDirect(page, name, hasRawName, modelToken) {
	return await withRetry(`direct:${name}`, async () => {
		const variants = productSlugVariants(name)
		const tried = []
		for (const s of variants.slice(0, 6)) {
			const url = `${BASE}/product/${s}/`
			// существование проверяем дешёвым HTTP, без Chrome:
			// 404 — товара нет; 301 в категорию — снят с публикации; 200 на /product/ — жив
			const { status, finalUrl } = await httpProbe(url)
			tried.push(`${s}:${status}`)
			if (status !== 200) continue
			if (!/\/product\//.test(finalUrl)) continue
			const { status: navStatus } = await goto(page, url)
			if (navStatus === 404) continue
			if (!(await isProductPage(page))) continue
			if (!(await pageMatchesModel(page, modelToken))) { await logWarn('MODEL_MISMATCH', `slug:${s}`); continue }
			const hasProductImage = await page.evaluate(() => {
				return Boolean(document.querySelector('.item_slider a.popup_link[href],.product-detail-gallery a.popup_link[href],.detail_picture a.popup_link[href],.slides a.popup_link[href],img.detail_picture[src],img.product-detail-image[src],.item_slider .thumbs li[data-big_img],.item_slider .thumbs li[data-small_img],img.xzoom-gallery[src],.item_slider img[xoriginal],.item_slider img[data-xpreview]'))
			})
			if (hasProductImage) return { url, status: 'ok', tried: url }
			if (await hasNoImage(page)) return { url: null, status: 'no-image', tried: url }
		}
		return { url: null, status: 'not-found', tried: tried.join(', '), authoritative: hasRawName }
	})
}

// запасной матчинг по индексу sitemap (27k слагов): ловит товары с нестандартным слагом
let sitemapSlugs = []
async function resolveViaSitemap(page, name, modelToken) {
	if (!sitemapSlugs.length || !modelToken) return null
	const cands = sitemapSlugs.filter(s => compactName(s.replace(/[_-]/g, ' ')).includes(modelToken)).slice(0, 3)
	for (const s of cands) {
		const url = `${BASE}/product/${s}/`
		const { status, finalUrl } = await httpProbe(url)
		if (status !== 200 || !/\/product\//.test(finalUrl)) continue
		const { status: navStatus } = await goto(page, url)
		if (navStatus === 404) continue
		if (!(await isProductPage(page))) continue
		if (!(await pageMatchesModel(page, modelToken))) { await logWarn('MODEL_MISMATCH', `sitemap:${s}`); continue }
		const hasProductImage = await page.evaluate(() => {
			return Boolean(document.querySelector('.item_slider a.popup_link[href],.product-detail-gallery a.popup_link[href],.detail_picture a.popup_link[href],.slides a.popup_link[href],img.detail_picture[src],img.product-detail-image[src],.item_slider .thumbs li[data-big_img],.item_slider .thumbs li[data-small_img],img.xzoom-gallery[src],.item_slider img[xoriginal],.item_slider img[data-xpreview]'))
		})
		if (hasProductImage) return { url, status: 'ok', tried: url }
		if (await hasNoImage(page)) return { url: null, status: 'no-image', tried: url }
	}
	return null
}

const SITEMAP_INDEX_FILE = path.resolve(`${ROOT}/sitemap-product-slugs.txt`)
const SITEMAP_MAX_AGE_MS = 20 * 60 * 60 * 1000
async function loadSitemapIndex() {
	try {
		if (await fs.pathExists(SITEMAP_INDEX_FILE) && Date.now() - (await fs.stat(SITEMAP_INDEX_FILE)).mtimeMs < SITEMAP_MAX_AGE_MS) {
			sitemapSlugs = (await fs.readFile(SITEMAP_INDEX_FILE, 'utf8')).split('\n').map(s => s.trim()).filter(Boolean)
			if (sitemapSlugs.length) { await logInfo('SITEMAP_CACHED', `slugs:${sitemapSlugs.length}`); return }
		}
		const indexXml = await (await fetch(`${BASE}/sitemap.xml`, { signal: AbortSignal.timeout(30000) })).text()
		const files = [...indexXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]).filter(u => /sitemap-iblock/.test(u))
		const slugs = new Set()
		for (const f of files) {
			const xml = await (await fetch(f, { signal: AbortSignal.timeout(60000) })).text()
			for (const m of xml.matchAll(/<loc>([^<]*\/product\/[^<]*)<\/loc>/g)) {
				const slug = m[1].replace(`${BASE}/product/`, '').replace(/\/$/, '')
				if (slug) slugs.add(slug)
			}
		}
		sitemapSlugs = [...slugs]
		await fs.writeFile(SITEMAP_INDEX_FILE, sitemapSlugs.join('\n'))
		await logInfo('SITEMAP_LOADED', `files:${files.length}`, `slugs:${sitemapSlugs.length}`)
	} catch (e) { await logWarn('SITEMAP_SKIP', e.message) }
}
async function resolveSearch(page, name) {
	return await withRetry(`search:${name}`, async () => {
		const queries = searchQueries(name)
		let bestResult = null
		let bestDebug = null
		for (const query of queries) {
			const searchUrl = BASE + '/search/?q=' + encodeURIComponent(query)
			await goto(page, searchUrl, SEARCH_DELAY)
			await page.waitForFunction(() => document.body && document.body.innerText.length > 100, { timeout: 15000 }).catch(() => null)
			await sleep(SEARCH_DELAY)
			const result = await page.evaluate(({ name, query, minScore }) => {
				const ruMap = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' }
				const removeDiacritics = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
				const translit = value => removeDiacritics(String(value || '').toLowerCase()).replace(/ё/g, 'е').replace(/[а-я]/g, ch => ruMap[ch] ?? ch)
				const normalizeName = value => translit(value).replace(/[^a-z0-9]+/gi, ' ').trim().replace(/\s+/g, ' ')
				const compactName = value => normalizeName(value).replace(/\s+/g, '')
				const target = normalizeName(name)
				const targetCompact = compactName(name)
				const queryNormalized = normalizeName(query)
				const queryCompact = compactName(query)
				const targetBrand = target.split(' ')[0] || ''
				const targetTokens = target.split(' ').filter(Boolean)
				const targetModelCompact = targetTokens.slice(1).join('')
				const scoreItem = item => {
					const title = normalizeName(item.title)
					const titleCompact = compactName(item.title)
					const titleTokens = title.split(' ').filter(Boolean)
					const titleBrand = titleTokens[0] || ''
					const href = normalizeName(item.href)
					const hrefCompact = compactName(item.href)
					let score = 0
					if (title === target) score += 1
					if (title.startsWith(target + ' ')) score += 0.95
					if (targetBrand && titleBrand === targetBrand) score += 0.25
					if (targetCompact && titleCompact.includes(targetCompact)) score += 0.85
					if (targetCompact && hrefCompact.includes(targetCompact)) score += 0.65
					if (queryCompact && titleCompact.includes(queryCompact)) score += 0.5
					if (queryCompact && hrefCompact.includes(queryCompact)) score += 0.35
					if (queryNormalized && title.includes(queryNormalized)) score += 0.35
					if (targetModelCompact && titleCompact.includes(targetModelCompact)) score += 0.65
					if (targetModelCompact && hrefCompact.includes(targetModelCompact)) score += 0.55
					const matchedTokens = targetTokens.filter(token => titleTokens.includes(token) || titleCompact.includes(token) || hrefCompact.includes(token)).length
					score += targetTokens.length ? (matchedTokens / targetTokens.length) * 0.5 : 0
					const numericTokens = targetTokens.filter(token => /\d/.test(token)).map(token => token.replace(/\D/g, '')).filter(Boolean)
					const hrefMatchedNumbers = numericTokens.filter(token => hrefCompact.includes(token)).length
					score += numericTokens.length ? (hrefMatchedNumbers / numericTokens.length) * 0.35 : 0
					if (!target.includes('komplekt') && title.includes('komplekt')) score -= 0.5
					if (!target.includes('komplekt') && item.title.includes('+')) score -= 0.35
					if (targetBrand && titleBrand && targetBrand !== titleBrand) score -= 0.6
					return score
				}
				const linkNodes = [...document.querySelectorAll('a[href*="/product/"]')]
				const items = linkNodes.map(a => ({ title: a.textContent || '', href: a.getAttribute('href') || '' })).filter(item => item.title.trim() && item.href)
				const ranked = items.map(item => ({ ...item, score: scoreItem(item) })).sort((a, b) => b.score - a.score)
				const best = ranked[0]
				return {
					best: best && best.score >= minScore ? { title: best.title, href: best.href, score: best.score.toFixed(2), query } : null,
					rawBest: best ? { title: best.title, href: best.href, score: best.score.toFixed(2), query } : null,
					count: items.length,
					linksCount: linkNodes.length,
					top: ranked.slice(0, 3).map(x => `${x.score.toFixed(2)}:${String(x.title).trim().replace(/\s+/g, ' ')}`).join(' | ')
				}
			}, { name, query, minScore: SEARCH_MIN_SCORE })
			if (!bestDebug || Number(result?.rawBest?.score || 0) > Number(bestDebug?.score || 0)) bestDebug = result?.rawBest ? { ...result.rawBest, count: result.count, linksCount: result.linksCount, top: result.top } : { query, score: '0.00', title: '-', href: '-', count: result?.count || 0, linksCount: result.linksCount || 0, top: 'no-candidates' }
			if (result?.best?.href) {
				bestResult = result.best
				break
			}
		}
		if (!bestResult?.href) return { url: null, status: 'not-found', debug: bestDebug }
		const full = bestResult.href.startsWith('http') ? bestResult.href : BASE + bestResult.href
		return { url: full, status: 'ok', title: bestResult.title, score: bestResult.score, query: bestResult.query, debug: bestDebug }
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
		catch (e) { await logError('DELETE_OLD_ERROR', p.name, old.url, e.message) }
	}
	return deleted
}
function failQueueItem(p, reason) {
	failedQueue.push({ name: p.name, source: p.source || null, reason })
}
async function processProduct(page, p) {
	const label = progressText(p)
	runState.current = p.name
	// матчинг идёт по родному имени поставщика («бренд + модель»): их слаги и
	// тайтлы собраны из него, а наше витринное имя («... тип, цвет») даёт мимо
	const matchName = p.raw_name || p.name.replace(/,.*$/, '') || p.name
	const modelToken = compactName(String(p.raw_name || '').trim().split(/\s+/).slice(1).join(' ') || matchName.replace(/,.*$/, ''))
	let stage = 'direct'
	let direct, search, url, images = []
	try {
		direct = await resolveDirect(page, matchName, Boolean(p.raw_name), modelToken)
		if (direct.url) url = direct.url
		if (!url && direct.status === 'no-image') {
			runState.noImage++
			await logInfo('NO_IMAGE', label, 'stage:direct', 'direct:no-image', 'search:skipped')
			await sleep(PRODUCT_DELAY)
			return
		}
		// родное имя надёжно даёт точный слаг (A/B: 180/181) — если все его варианты
		// 404/редирект, товар не опубликован: поиск в Chrome не нужен, едем дальше
		if (!url && direct.authoritative) {
			stage = 'sitemap'
			const viaSitemap = await resolveViaSitemap(page, matchName, modelToken)
			if (viaSitemap?.url) url = viaSitemap.url
			else if (viaSitemap?.status === 'no-image') {
				runState.noImage++
				await logInfo('NO_IMAGE', label, 'stage:sitemap', 'sitemap:no-image', 'search:skipped')
				await sleep(PRODUCT_DELAY)
				return
			}
		}
		if (!url && direct.authoritative) {
			runState.notFound++
			await logError('NOT_FOUND', label, 'stage:direct', `direct:${direct.status}`, 'search:skipped', `tried:${direct.tried}`)
			failQueueItem(p, 'not-found')
			await sleep(PRODUCT_DELAY)
			return
		}
		if (!url) {
			stage = 'search'
			search = await resolveSearch(page, matchName)
			if (search.url) url = search.url
		}
		if (!url) {
			const debug = search?.debug
				if (direct?.status === 'no-image') await logInfo('NO_IMAGE', label, `stage:${stage}`, `direct:${direct.status}`, `search:${search?.status || 'not-used'}`)
				else {
					runState.notFound++
					await logError('NOT_FOUND', label, `stage:${stage}`, `direct:${direct?.status || 'fail'}`, `search:${search?.status || 'not-used'}`, debug ? `best:${debug.score}:${String(debug.title).trim().replace(/\s+/g, ' ')}` : 'best:-', debug ? `query:${debug.query}` : 'query:-')
				failQueueItem(p, 'not-found')
			}
			await sleep(PRODUCT_DELAY)
			return
		}
		stage = 'images'
		const imageResult = await getImages(page, url)
		images = imageResult.images
		if (!images.length) {
			if (imageResult.status === 'no-image') { runState.noImage++; await logInfo('NO_IMAGE', label, 'stage:images', `reason:${imageResult.status}`, `raw:${imageResult.rawCount || 0}`, `url:${url}`) }
			else {
				runState.notFound++
				await logError('NO_IMAGES_FOUND', label, 'stage:images', `reason:${imageResult.status}`, `raw:${imageResult.rawCount || 0}`, `url:${url}`)
				failQueueItem(p, 'no-images')
			}
			await sleep(PRODUCT_DELAY)
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
			await sleep(PRODUCT_DELAY)
			return
		}
		stage = MODE === MODES.FULL ? 'replace' : 'insert'
		const deleted = MODE === MODES.FULL ? await replaceProductImages(p, rows) : (await saveMissingImages(rows), 0)
		const originalKb = kb(sum(rows, 'originalSize'))
		const finalKb = kb(sum(rows, 'finalSize'))
		const optimizedCount = rows.filter(row => row.optimized).length
		const originalCount = rows.length - optimizedCount
		const foundSource = direct?.url ? 'direct' : 'search'
		const matched = foundSource === 'direct' ? direct.tried : `${search?.score || '-'}:${String(search?.title || '-').trim().replace(/\s+/g, ' ')}`
		const query = foundSource === 'search' ? `query:${search?.query || '-'}` : 'query:-'
		runState.ok++
		await logSuccess('OK', label, `source:${foundSource}`, query, `matched:${matched}`, `imgs:${rows.length}/${images.length}`, `size:${originalKb}KB->${finalKb}KB`, `optimized:${optimizedCount}`, `original:${originalCount}`, `replaced:${deleted}`, `skip:${skipCount}`)
		await sleep(PRODUCT_DELAY)
	} catch (e) {
		runState.errors++
		await logError('ERROR', label, `stage:${stage}`, e.message)
		failQueueItem(p, `error:${stage}`)
		await sleep(PRODUCT_DELAY)
	}
}
async function worker(browser, queue) {
	let page = await browser.newPage()
	await attachJunkBlocker(page)
	await page.setViewport({ width: 1440, height: 1000 })
	let done = 0
	while (true) {
		const p = queue.shift()
		if (!p) break
		await processProduct(page, p)
		progress.done++
		done++
		await flushStateThrottled()
		// Chromium за много часов копит кэши в рендерере; периодическое
		// перерождение страницы сбрасывает его память. 0 = выключить.
		if (PAGE_RECYCLE > 0 && done % PAGE_RECYCLE === 0) {
			await page.close().catch(() => null)
			page = await browser.newPage()
			await attachJunkBlocker(page)
			await page.setViewport({ width: 1440, height: 1000 })
			await logInfo('PAGE_RECYCLED', `done:${done}`)
		}
	}
	await page.close()
}

// нам нужна только разметка галереи: картинки/стили/шрифты не качаем (сами качаем
// изображения прямым fetch) — минус нагрузка на CPU и сеть, важна на 1-ядерном VPS
function attachJunkBlocker(page) {
	return page.setRequestInterception(true).then(() => {
		page.on('request', req => {
			const t = req.resourceType()
			if (t === 'image' || t === 'stylesheet' || t === 'font' || t === 'media') req.abort().catch(() => {})
			else req.continue().catch(() => {})
		})
	}).catch(() => null)
}
async function loadQueueProducts() {
	if (!(await fs.pathExists(QUEUE_FILE))) {
		await fs.writeJson(QUEUE_FILE, [], { spaces: 2 })
		await logWarn('QUEUE_NOT_FOUND_CREATED', QUEUE_FILE)
		return []
	}
	const raw = await fs.readJson(QUEUE_FILE)
	const items = Array.isArray(raw) ? raw : []
	const names = items.map(item => typeof item === 'string' ? item : item?.name).filter(Boolean)
	if (!names.length) return []
	const rows = await sql`select id,name,source,raw->>'РабочееНаименование' as raw_name from products where name in ${sql(names)} order by name`
	const found = new Set(rows.map(row => row.name))
	for (const name of names) {
		if (!found.has(name)) failedQueue.push({ name, source: null, reason: 'not-in-db' })
	}
	return rows
}
async function loadDbProducts(selectedBrands) {
	if (MODE === MODES.MISSING) {
		return await sql`
			select p.id,p.name,p.source,p.raw->>'РабочееНаименование' as raw_name from products p
			where not exists(select 1 from product_images pi where pi.product_id=p.id and pi.source='fetch')
				and lower(trim(p.brand->>'name')) in ${sql(selectedBrands)}
			order by p.name
		`
	}
	return await sql`
		select id,name,source,raw->>'РабочееНаименование' as raw_name from products
		where lower(trim(brand->>'name')) in ${sql(selectedBrands)}
		order by name
	`
}
async function saveQueueAfterRun() {
	if (SOURCE !== SOURCES.QUEUE) return
	const unique = []
	const seen = new Set()
	for (const item of failedQueue) {
		if (!item.name || seen.has(item.name)) continue
		seen.add(item.name)
		unique.push(item)
	}
	await fs.ensureDir(path.dirname(QUEUE_FILE))
	await fs.writeJson(QUEUE_FILE, unique, { spaces: 2 })
	await logInfo('QUEUE_UPDATED', `failed:${unique.length}`, `file:${QUEUE_FILE}`)
}
async function main() {
	let browser
	try {
		await fs.ensureDir(ROOT)
		await fs.writeFile(LOG, '')
		// FETCH_IMAGES_BRANDS='gorenje,bosch' — запустить точечно по брендам (иначе все из brands.json)
		const brandsFilter = String(process.env.FETCH_IMAGES_BRANDS || '').split(',').map(b => b.trim().toLowerCase()).filter(Boolean)
		const selectedBrands = allowedBrands().filter(b => !brandsFilter.length || brandsFilter.includes(b.trim().toLowerCase()))
		if (!selectedBrands.length) throw new Error('brands.json is empty (or FETCH_IMAGES_BRANDS matched nothing)')
		// защита от второго запуска (админка/cron/вручную одновременно):
		// предыдущий статус running жив, пока его heartbeat моложе 15 минут
		try {
			const prevRows = await sql`select value from settings where key = ${IMAGES_STATE_KEY} limit 1`
			const prev = prevRows.length ? JSON.parse(prevRows[0].value) : null
			if (prev?.status === 'running' && Date.now() - Date.parse(prev.updatedAt || 0) < STATE_STALE_MS) {
				await logError('ALREADY_RUNNING', 'второй запуск запрещён: предыдущий прогон ещё жив (heartbeat < 15 мин)')
				await sql.end()
				return
			}
		} catch {}
		await logInfo('START', `source:${SOURCE}`, `mode:${MODE}`, `threads:${THREADS}`, `brands:${selectedBrands.length}`, `queue:${QUEUE_FILE}`)
		await loadSitemapIndex()
		browser = await puppeteer.launch({ headless: HEADLESS, defaultViewport: null, args: ['--no-sandbox', '--disable-setuid-sandbox'] })
		const products = SOURCE === SOURCES.QUEUE ? await loadQueueProducts() : await loadDbProducts(selectedBrands)
		progress.total = products.length
		progress.done = 0
		runState.total = products.length
		await flushState()
		await logInfo('TOTAL', products.length)
		const queue = [...products]
		const workers = []
		for (let i = 0; i < THREADS; i++) workers.push(worker(browser, queue))
		await Promise.all(workers)
		await saveQueueAfterRun()
		await browser.close()
		browser = null
		runState.status = 'done'
		runState.finishedAt = now()
		await flushState()
		await logInfo('FINISHED')
		await sql.end()
	} catch (e) {
		await logError('FATAL', e.stack || e.message)
		runState.status = 'failed'
		runState.error = String(e?.message || e).slice(0, 500)
		runState.finishedAt = now()
		await flushState().catch(() => null)
		if (SOURCE === SOURCES.QUEUE) await saveQueueAfterRun().catch(() => null)
		if (browser) await browser.close().catch(() => null)
		await sql.end().catch(() => null)
		process.exitCode = 1
	}
}
export async function deleteImage(url) {
	const key = s3KeyFromUrl(url)
	if (!key) return
	await deleteFromS3(key)
}
main()