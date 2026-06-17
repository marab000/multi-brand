// # Синк товаров тетриса по апи
// caffeinate -dims node scripts/sync-tetrasis-products/sync.js

// # Фетч комплектов тетриса с сайта
// caffeinate -dims node scripts/fetch-tetrasis-kits/sync.js

// # Докачать недостающие картинки с сайта тетриса
// FETCH_IMAGES_SOURCE=db FETCH_IMAGES_MODE=missing caffeinate -dims node scripts/fetch-tetrasis-images/fetch.js

// # Скачать ВСЕ картинки с сайта тетриса, в т.ч перезаписать существующие
// FETCH_IMAGES_SOURCE=db FETCH_IMAGES_MODE=full caffeinate -dims node scripts/fetch-tetrasis-images/fetch.js

// # FETCH_IMAGES_SOURCE=queue означает что скрипт будет смотреть продукты из файла-очереди, который создается, например, после скачивания комплектов
// FETCH_IMAGES_SOURCE=queue FETCH_IMAGES_MODE=missing caffeinate -dims node scripts/fetch-tetrasis-images/fetch.js

import 'dotenv/config'
import postgres from 'postgres'
import brands from './brands.json' with { type: 'json' }
import excludedCategories from './excluded-categories.json' with { type: 'json' }
import { resolveCatalog } from '../../src/lib/server/categories.ts'
const SOURCE = 'tetrasis-api'
const LOG = 'scripts/sync-tetrasis-products/sync.log'
const API_KEY = process.env.TETRAIS_API_KEY
if (!API_KEY) throw new Error('TETRAIS_API_KEY missing')
const sql = postgres({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 5432), database: process.env.DB_NAME, username: process.env.DB_USER, password: process.env.DB_PASSWORD })
const now = () => new Date().toISOString()
async function log(...a) {
	const line = `${now()} ${a.join(' ')}`
	console.log(line)
	await (await import('fs-extra')).default.appendFile(LOG, line + '\n')
}
const normalizeCompare = s => String(s || '').toLowerCase().replace(/['"]/g, '').trim()
const cleanBrand = s => String(s || '').replace(/['"]/g, '').trim()
function findMatchedBrand(apiName) {
	const n = normalizeCompare(apiName)
	return brands.find(b => n.startsWith(normalizeCompare(b.name)))
}
async function safeJsonFetch(url) {
	const r = await fetch(url)
	const t = await r.text()
	try { return JSON.parse(t) }
	catch {
		await log('API_ERROR', url, t.slice(0, 500))
		return null
	}
}
function cleanSpecKey(key) { return key.replace(/_[a-f0-9]{32}$/, '').trim() }
function extractSpecs(item) {
	const values = item['ДопРеквизиты'] || {}
	const names = item['ДопРеквизитыНаименование'] || {}
	const specs = {}
	for (const key in values) {
		const rawValue = values[key]
		if (rawValue == null || rawValue === '') continue
		specs[names[key] || cleanSpecKey(key)] = rawValue
	}
	if (item['Вес']) specs['Вес'] = item['Вес']
	if (item['Объем']) specs['Объем'] = item['Объем']
	return specs
}
function toNumber(v) {
	if (v == null) return null
	let s = String(v).trim()
	if (!s) return null
	s = s.replace(/\s/g, '').replace(/[^0-9,.\-]/g, '')
	const lastComma = s.lastIndexOf(',')
	const lastDot = s.lastIndexOf('.')
	if (lastComma !== -1 && lastDot !== -1) s = lastDot > lastComma ? s.replace(/,/g, '') : s.replace(/\./g, '').replace(',', '.')
	else if (lastComma !== -1) {
		const len = s.length - lastComma - 1
		s = len === 1 || len === 2 ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '')
	} else if (lastDot !== -1) {
		const len = s.length - lastDot - 1
		if (!(len === 1 || len === 2)) s = s.replace(/\./g, '')
	}
	const n = Number(s)
	return Number.isFinite(n) ? n / 1000 : null
}
function extractPrices(rows) {
	const map = new Map()
	for (const p of rows) {
		const id = String(p['НоменклатураID'])
		if (!map.has(id)) map.set(id, { price_rrc: null, price_opt: null, price_ric: null })
		const row = map.get(id)
		const type = (p['ТипЦены'] || p['ВидЦены'] || '').toLowerCase()
		const val = toNumber(p['Цена'])
		if (val === null) continue
		if (type.includes('ррц')) row.price_rrc = val
		else if (type.includes('опт')) row.price_opt = val
		else if (type.includes('риц')) row.price_ric = val
	}
	return map
}
async function syncBrand(apiBrand) {
	const brand = findMatchedBrand(apiBrand.NAME)
	if (!brand) return
	const cleanName = cleanBrand(brand.name)
	await log('SYNC_BRAND', cleanName, 'api:', apiBrand.NAME)
	const products = await safeJsonFetch(`https://tetrasis-bt.ru/download/${API_KEY}/${apiBrand.ID}/0/`)
	const pricesRaw = await safeJsonFetch(`https://tetrasis-bt.ru/download/${API_KEY}/${apiBrand.ID}/2/`)
	if (!products || !pricesRaw) {
		await log('SKIP_BRAND', apiBrand.NAME)
		return
	}
	const priceMap = extractPrices(pricesRaw)
	const rows = []
	for (const item of products) {
		const id = String(item.ID)
		const prices = priceMap.get(id)
		if (!prices || !(prices.price_rrc || prices.price_opt || prices.price_ric)) continue
		const rawCategory = item['ГруппаАналитическогоУчета'] ?? null
		const rawType = item['ЦеноваяГруппа'] ?? null
		const catalog = resolveCatalog(rawCategory, rawType)
		rows.push({
			external_id: id,
			source: SOURCE,
			brand: sql.json({ name: cleanName, api: apiBrand.NAME }),
			name: item['РабочееНаименование'] ?? null,
			description: item['ТекстовоеОписание'] ?? null,
			category: rawCategory,
			product_type: rawType,
			catalog_root_slug: catalog.root?.slug ?? null,
			catalog_root_name: catalog.root?.name ?? null,
			catalog_group_slug: catalog.group?.slug ?? null,
			catalog_group_name: catalog.group?.name ?? null,
			catalog_leaf_slug: catalog.leaf?.slug ?? null,
			catalog_leaf_name: catalog.leaf?.name ?? null,
			price_rrc: prices.price_rrc,
			price_opt: prices.price_opt,
			price_ric: prices.price_ric,
			specs: sql.json(extractSpecs(item)),
			raw: sql.json({ ...item, imported_from: SOURCE, imported_at: now() })
		})
	}
	if (!rows.length) {
		await log('NO_ROWS_WITH_PRICE', cleanName)
		return
	}
	await sql`
		insert into products ${sql(rows)}
		on conflict (external_id) do update set
		source=excluded.source,
		brand=excluded.brand,
		name=excluded.name,
		description=excluded.description,
		category=excluded.category,
		product_type=excluded.product_type,
		catalog_root_slug=excluded.catalog_root_slug,
		catalog_root_name=excluded.catalog_root_name,
		catalog_group_slug=excluded.catalog_group_slug,
		catalog_group_name=excluded.catalog_group_name,
		catalog_leaf_slug=excluded.catalog_leaf_slug,
		catalog_leaf_name=excluded.catalog_leaf_name,
		price_rrc=excluded.price_rrc,
		price_opt=excluded.price_opt,
		price_ric=excluded.price_ric,
		specs=excluded.specs,
		raw=excluded.raw,
		updated_at=now()
	`
	const ids = rows.map(r => r.external_id)
	await sql`
		delete from products
		where source=${SOURCE}
		and brand->>'api'=${String(apiBrand.NAME)}
		and external_id not in ${sql(ids)}
	`
	await log('DONE_BRAND', cleanName, 'rows:', rows.length)
}
async function removeExcludedCategories() {
	const { categories = [], category_product_types = {} } = excludedCategories
	if (categories.length) {
		await sql`delete from products where source=${SOURCE} and category = ANY(${sql.array(categories)})`
	}
	let query = sql``
	let first = true
	for (const [category, types] of Object.entries(category_product_types)) {
		if (!types.length) continue
		const condition = sql`(category = ${category} and product_type = ANY(${sql.array(types)}))`
		query = first ? sql`${condition}` : sql`${query} OR ${condition}`
		first = false
	}
	if (!first) await sql`delete from products where source=${SOURCE} and (${query})`
	await log('EXCLUDED_REMOVED')
}
async function main() {
	const fs = (await import('fs-extra')).default
	await fs.writeFile(LOG, '')
	const apiBrands = await safeJsonFetch(`https://tetrasis-bt.ru/exch_api.php?CODE=${API_KEY}`)
	if (!apiBrands) throw new Error('Brands list fetch failed')
	for (const b of apiBrands) {
		try { await syncBrand(b) }
		catch (e) { await log('FAILED_BRAND', b?.NAME, e.stack || e.message) }
	}
	await removeExcludedCategories()
	await sql.end()
	await log('FINISHED')
}
main().catch(async e => {
	await log('FATAL', e.stack || e.message).catch(() => null)
	await sql.end().catch(() => null)
	process.exit(1)
})