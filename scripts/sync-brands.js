import 'dotenv/config'
import postgres from 'postgres'
import brands from './brands.json' with { type: 'json' }
import excludedCategories from './excluded-categories.json' with { type: 'json' }

const sql = postgres({
	host: process.env.DB_HOST,
	port: Number(process.env.DB_PORT || 5432),
	database: process.env.DB_NAME,
	username: process.env.DB_USER,
	password: process.env.DB_PASSWORD
})

const API_KEY = process.env.TETRAIS_API_KEY
if (!API_KEY) throw new Error('TETRAIS_API_KEY missing')

const normalizeCompare = s =>
	String(s || '')
		.toLowerCase()
		.replace(/['"]/g, '')
		.trim()

const cleanBrand = s =>
	String(s || '')
		.replace(/['"]/g, '')
		.trim()

function findMatchedBrand(apiName) {
	const n = normalizeCompare(apiName)
	return brands.find(b => n.startsWith(normalizeCompare(b.name)))
}

async function safeJsonFetch(url) {
	const r = await fetch(url)
	const t = await r.text()
	try { return JSON.parse(t) }
	catch { throw new Error(`Not JSON: ${t.slice(0, 200)}`) }
}

function cleanSpecKey(key) {
	return key.replace(/_[a-f0-9]{32}$/, '').trim()
}

function extractSpecs(item) {
	const values = item['ДопРеквизиты'] || {}
	const names = item['ДопРеквизитыНаименование'] || {}
	const specs = {}
	for (const key in values) {
		const rawValue = values[key]
		if (rawValue == null || rawValue === '') continue
		const label = names[key] || cleanSpecKey(key)
		specs[label] = rawValue
	}
	if (item['Вес']) specs['Вес'] = item['Вес']
	if (item['Объем']) specs['Объем'] = item['Объем']

	return specs
}

function toNumber(v) {
	if (v == null) return null
	const n = parseFloat(
		String(v)
			.replace(/\s/g, '')
			.replace(',', '.')
			.replace(/[^0-9.\-]/g, '')
	)
	return isNaN(n) ? null : n
}

function extractPrices(rows) {
	const map = new Map()
	for (const p of rows) {
		const id = String(p['НоменклатураID'])
		if (!map.has(id)) {
			map.set(id, { price_rrc: null, price_opt: null, price_ric: null })
		}
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
	console.log('Sync:', cleanName, '| API:', apiBrand.NAME)
	const products = await safeJsonFetch(`https://tetrasis-bt.ru/download/${API_KEY}/${apiBrand.ID}/0/`)
	const pricesRaw = await safeJsonFetch(`https://tetrasis-bt.ru/download/${API_KEY}/${apiBrand.ID}/2/`)
	const priceMap = extractPrices(pricesRaw)
	const rows = []
	for (const item of products) {
		const id = String(item.ID)
		const prices = priceMap.get(id)
		if (!prices) continue
		if (!(prices.price_rrc || prices.price_opt || prices.price_ric)) continue
		const specs = extractSpecs(item)
		rows.push({
			brand: sql.json({
				name: cleanName,
				api: apiBrand.NAME,
			}),
			name: item['РабочееНаименование'] ?? null,
			description: item['ТекстовоеОписание'] ?? null,
			category: item['ГруппаАналитическогоУчета'] ?? null,
			product_type: item['ЦеноваяГруппа'] ?? null,
			price_rrc: prices.price_rrc,
			price_opt: prices.price_opt,
			price_ric: prices.price_ric,
			specs: sql.json(specs),
			raw: sql.json(item)
		})
	}
	if (!rows.length) {
		console.log('No rows with price')
		return
	}
	await sql`
		insert into products ${sql(rows)}
		on conflict (external_id) do update set
		brand=excluded.brand,
		name=excluded.name,
		description=excluded.description,
		category=excluded.category,
		product_type=excluded.product_type,
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
		where brand->>'api'=${String(apiBrand.NAME)}
		and external_id not in ${sql(ids)}
		`
	console.log('Done:', rows.length)
}

async function removeExcludedCategories() {
	const { categories = [], category_product_types = {} } = excludedCategories
	if (categories.length) {
		await sql`
			delete from products
			where category = ANY(${sql.array(categories)})
		`
	}
	let query = sql``
	let first = true
	for (const [category, types] of Object.entries(category_product_types)) {
		if (!types.length) continue
		const condition = sql`(category = ${category} and product_type = ANY(${sql.array(types)}))`
		if (first) {
			query = sql`${condition}`
			first = false
		} else {
			query = sql`${query} OR ${condition}`
		}
	}

	if (!first) {
		await sql`
			delete from products
			where ${query}
		`
	}

	console.log('Excluded categories & product_types removed')
}

async function main() {
	const apiBrands = await safeJsonFetch(`https://tetrasis-bt.ru/exch_api.php?CODE=${API_KEY}`)
	for (const b of apiBrands) {
		await syncBrand(b)
	}
	await removeExcludedCategories()
	await sql.end()
}

main()