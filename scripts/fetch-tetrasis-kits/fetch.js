import 'dotenv/config'
import puppeteer from 'puppeteer'
import postgres from 'postgres'
import fs from 'fs-extra'
import path from 'path'
import brands from '../sync-tetrasis-products/brands.json' with { type: 'json' }
const BASE = 'https://tetrasis-bt.ru'
const SOURCE = 'tetrasis-kit'
const START_URL = `${BASE}/catalog/10917-komplekty2/`
const ROOT = 'scripts/fetch-tetrasis-kits'
const LOG = path.resolve(`${ROOT}/fetch.log`)
const OUT_JSONL = path.resolve(`${ROOT}/kits-data.jsonl`)
const MAX_PAGES = Number(process.env.TETRASIS_KITS_MAX_PAGES || 999)
const THREADS = Number(process.env.TETRASIS_KITS_THREADS || 3)
const HEADLESS = process.env.TETRASIS_KITS_HEADLESS !== 'false'
const PAGE_DELAY = Number(process.env.TETRASIS_KITS_PAGE_DELAY || 900)
const DETAIL_DELAY = Number(process.env.TETRASIS_KITS_DETAIL_DELAY || 500)
const RETRIES = Number(process.env.TETRASIS_KITS_RETRIES || 3)
const sql = postgres({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 5432), database: process.env.DB_NAME, username: process.env.DB_USER, password: process.env.DB_PASSWORD, max: Math.max(THREADS + 2, 5) })
const colors = { green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', blue: '\x1b[36m', gray: '\x1b[90m', reset: '\x1b[0m' }
const sleep = ms => new Promise(r => setTimeout(r, ms))
const now = () => new Date().toISOString()
function stripAnsi(value) { return String(value).replace(/\x1b\[[0-9;]*m/g, '') }
function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim() }
function normalize(value) { return clean(value).toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9&+]+/gi, ' ').replace(/\s+/g, ' ').trim() }
const allowedBrands = brands.map(b => ({ name: clean(b), normalized: normalize(b) })).filter(b => b.normalized)
function getAllowedBrand(name) {
	const n = normalize(name)
	return allowedBrands.find(b => n === b.normalized || n.startsWith(`${b.normalized} `) || n.startsWith(`${b.normalized}+`)) || null
}
function kitExternalId(kit) { return `kit:${kit.external_id || kit.url}` }
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
			if (attempt < RETRIES) await sleep(1500 * attempt)
		}
	}
	throw new Error(`${label}: ${lastError?.message || lastError}`)
}
function pageUrl(page) { return page === 1 ? START_URL : `${START_URL}?PAGEN_2=${page}` }
function splitKitItems(name) { return clean(name).split('+').map(v => clean(v)).filter(Boolean) }
function getKitType(name) {
	const count = splitKitItems(name).length
	if (count >= 5) return 'Комплект варка + духовка + свч + пмм + холодил.'
	if (count >= 4) return 'Комплект варка + духовка + свч + кофемашина'
	if (count >= 3) return 'Комплект варка + духовка + свч'
	return 'Комплект варка + духовка'
}
async function findExistingKit(kit) {
	const rows = await sql`select id,name from products where external_id=${kitExternalId(kit)} limit 1`
	return rows[0] || null
}
async function findExistingProduct(item) {
	const article = item.specs?.['Артикул'] || item.raw?.detail?.specs?.['Артикул']
	const name = clean(item.name)
	const shortName = clean(item.raw?.list_item?.name || item.source_name)
	if (article) {
		const rows = await sql`select id,name,external_id from products where specs->>'Артикул'=${String(article)} limit 1`
		if (rows[0]) return { ...rows[0], match: 'article', article: String(article) }
	}
	if (name) {
		const rows = await sql`select id,name,external_id from products where name=${name} limit 1`
		if (rows[0]) return { ...rows[0], match: 'name' }
	}
	if (shortName) {
		const rows = await sql`select id,name,external_id from products where name ilike ${`${shortName}%`} limit 1`
		if (rows[0]) return { ...rows[0], match: 'short_name' }
	}
	return null
}
async function goto(page, url, delay) {
	return await withRetry(`goto:${url}`, async () => {
		const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
		await sleep(delay)
		return response?.status() || 0
	})
}
async function scrapePage(page, pageNumber) {
	await goto(page, pageUrl(pageNumber), PAGE_DELAY)
	return await page.evaluate(({ BASE, pageNumber }) => {
		const abs = value => {
			if (!value) return null
			try { return new URL(value, BASE).href } catch { return null }
		}
		const priceNumber = value => {
			const clean = String(value || '').replace(/\s+/g, ' ').trim()
			const num = Number(clean.replace(/[^\d.,]/g, '').replace(',', '.'))
			return Number.isFinite(num) ? Math.round(num) : null
		}
		const splitKitItems = name => String(name || '').split('+').map(v => v.replace(/\s+/g, ' ').trim()).filter(Boolean)
		const cards = [...document.querySelectorAll('.item_block.js-notice-block,.catalog_block .item_block,.catalog_item_wrapp.item')]
		const result = []
		for (const card of cards) {
			const link = card.querySelector('.item-title a[href],a.js-notice-block__title[href],a.thumb[href]')
			const titleNode = card.querySelector('.item-title a span,.item-title a,.js-notice-block__title span,.js-notice-block__title')
			const imageNode = card.querySelector('.image_wrapper_block img[data-src],.image_wrapper_block img[src],a.thumb img[data-src],a.thumb img[src],img.img-responsive[data-src],img.img-responsive[src]')
			const priceNode = card.querySelector('.price[data-value],.price_value')
			const name = titleNode?.textContent?.replace(/\s+/g, ' ').trim()
			const url = abs(link?.getAttribute('href'))
			const sourceNames = splitKitItems(name)
			if (!name || !url || !url.includes('/product/') || sourceNames.length < 2) continue
			const image = abs(imageNode?.getAttribute('data-src') || imageNode?.getAttribute('src'))
			const priceText = priceNode?.getAttribute('data-value')?.split('~')?.[0] || priceNode?.textContent || ''
			const stickers = [...card.querySelectorAll('.stickers div[class],.stickers div div')].map(v => v.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean)
			const externalId = card.getAttribute('data-id') || card.querySelector('[data-id]')?.getAttribute('data-id') || null
			result.push({ page: pageNumber, external_id: externalId, name, source_names: sourceNames, price_rrc: priceNumber(priceText), price_text: priceNode?.textContent?.replace(/\s+/g, ' ').trim() || null, url, image, stickers: [...new Set(stickers)] })
		}
		return result
	}, { BASE, pageNumber })
}
async function scrapeKitDetail(page, kit) {
	await goto(page, kit.url, DETAIL_DELAY)
	return await page.evaluate(({ BASE }) => {
		const abs = value => {
			if (!value) return null
			try { return new URL(value, BASE).href } catch { return null }
		}
		const priceNumber = value => {
			const clean = String(value || '').replace(/\s+/g, ' ').trim()
			const num = Number(clean.replace(/[^\d.,]/g, '').replace(',', '.'))
			return Number.isFinite(num) ? Math.round(num) : null
		}
		const text = selector => document.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim() || null
		const imageNode = document.querySelector('.item_slider img[xoriginal],.item_slider img[data-xpreview],.item_slider img[data-src],.item_slider img[src],img.detail_picture[src]')
		const image = abs(document.querySelector('meta[property="og:image"]')?.getAttribute('content')) || abs(imageNode?.getAttribute('xoriginal') || imageNode?.getAttribute('data-xpreview') || imageNode?.getAttribute('data-src') || imageNode?.getAttribute('src'))
		const items = [...document.querySelectorAll('.set_wrapp li.item')].map((item, index) => {
			const link = item.querySelector('.item-title2 a[href],.item-title a[href],a[href*="/product/"]')
			const imageNode = item.querySelector('.image img[data-src],.image img[src],img[data-src],img[src]')
			const priceNode = item.querySelector('.price[data-value],.price_value')
			const priceText = priceNode?.getAttribute('data-value')?.split('~')?.[0] || priceNode?.textContent || ''
			return { position: index + 1, name: link?.textContent?.replace(/\s+/g, ' ').trim() || imageNode?.getAttribute('alt') || null, source_name: link?.textContent?.replace(/\s+/g, ' ').trim() || null, url: abs(link?.getAttribute('href')), price_rrc: priceNumber(priceText), price_text: priceNode?.textContent?.replace(/\s+/g, ' ').trim() || null, preview_image: abs(imageNode?.getAttribute('data-src') || imageNode?.getAttribute('src')) }
		}).filter(item => item.name && item.url)
		return { title: text('h1'), description: document.querySelector('meta[name="description"]')?.getAttribute('content') || text('.preview_text,.detail_text'), image, items }
	}, { BASE })
}
async function collectCatalogItems(page) {
	const items = []
	const seen = new Set()
	for (let pageNumber = 1; pageNumber <= MAX_PAGES; pageNumber++) {
		try {
			const pageItems = await scrapePage(page, pageNumber)
			if (!pageItems.length) {
				await logWarn(`PAGE ${pageNumber} EMPTY stop`)
				break
			}
			let added = 0
			for (const item of pageItems) {
				if (seen.has(item.url)) continue
				seen.add(item.url)
				items.push(item)
				added++
			}
			await logSuccess(`CATALOG PAGE ${pageNumber}/${MAX_PAGES} found:${pageItems.length} added:${added} total:${items.length}`)
		} catch (e) {
			await logError(`CATALOG PAGE ${pageNumber} ERROR ${e.message}`)
		}
	}
	return items
}
async function processKit(page, item, index, total, state) {
	const allowedBrand = getAllowedBrand(item.name)
	if (!allowedBrand) {
		state.skippedBrand++
		await logWarn(`SKIP [${index}/${total}] BRAND_NOT_ALLOWED ${item.name}`)
		return null
	}
	const existingKit = await findExistingKit(item)
	if (existingKit) {
		state.skippedExists++
		await logWarn(`SKIP [${index}/${total}] KIT_EXISTS ${item.name} db:${existingKit.name}`)
		return null
	}
	const detail = await scrapeKitDetail(page, item)
	const kitItems = []
	const missingItems = []
	for (const child of detail.items) {
		const childProduct = await findExistingProduct(child)
		if (!childProduct) {
			missingItems.push(child.name)
			continue
		}
		kitItems.push({ ...child, child_product_id: childProduct.id, matched_name: childProduct.name, match: childProduct.match, raw: { list_item: child } })
	}
	if (!detail.items.length || missingItems.length) {
		state.skippedMissingItems++
		await logWarn(`SKIP [${index}/${total}] ITEM_MISSING ${item.name} found:${kitItems.length}/${detail.items.length} missing:${missingItems.join(' | ') || '-'}`)
		return null
	}
	const row = { ...item, brand: { name: allowedBrand.name, api: allowedBrand.name }, description: detail.description, image: detail.image || item.image, source: SOURCE, category: 'Встраиваемая техника', product_type: getKitType(item.name), kit_items: kitItems, raw: { catalog_item: item, detail }, fetched_at: now() }
	state.rows.push(row)
	await fs.appendFile(OUT_JSONL, JSON.stringify(row) + '\n')
	await logSuccess(`KIT [${state.rows.length}] source:${index}/${total} ${row.name} brand:${allowedBrand.name} items:${kitItems.length}`)
	return row
}
async function worker(id, browser, queue, state) {
	const page = await browser.newPage()
	await page.setViewport({ width: 1365, height: 900 })
	await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36')
	try {
		while (queue.length) {
			const task = queue.shift()
			if (!task) break
			try { await processKit(page, task.item, task.index, task.total, state) }
			catch (e) { await logError(`THREAD ${id} KIT_ERROR [${task.index}/${task.total}] ${task.item.name} ${e.stack || e.message}`) }
		}
	} finally {
		await page.close().catch(() => null)
	}
}
async function main() {
	await fs.ensureDir(ROOT)
	await fs.writeFile(LOG, '')
	await fs.remove(OUT_JSONL)
	const browser = await puppeteer.launch({ headless: HEADLESS, args: ['--no-sandbox', '--disable-setuid-sandbox'] })
	const catalogPage = await browser.newPage()
	await catalogPage.setViewport({ width: 1365, height: 900 })
	await catalogPage.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36')
	const state = { rows: [], skippedExists: 0, skippedBrand: 0, skippedMissingItems: 0 }
	try {
		await logInfo(`START ${START_URL} pages:${MAX_PAGES} threads:${THREADS} brands:${allowedBrands.length}`)
		const catalogItems = await collectCatalogItems(catalogPage)
		await catalogPage.close().catch(() => null)
		const queue = catalogItems.map((item, index) => ({ item, index: index + 1, total: catalogItems.length }))
		const workers = Array.from({ length: Math.max(1, THREADS) }, (_, index) => worker(index + 1, browser, queue, state))
		await Promise.all(workers)
		await logSuccess(`DONE total:${state.rows.length} skippedExists:${state.skippedExists} skippedBrand:${state.skippedBrand} skippedMissingItems:${state.skippedMissingItems} data:${OUT_JSONL}`)
	} finally {
		await browser.close().catch(() => null)
		await sql.end().catch(() => null)
	}
}
main().catch(async e => {
	await logError(`FATAL ${e.stack || e.message}`).catch(() => null)
	await sql.end().catch(() => null)
	process.exit(1)
})