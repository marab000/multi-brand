import 'dotenv/config'
import postgres from 'postgres'
import brands from './brands.json' with { type: 'json' }

const sql = postgres({
	host: process.env.DB_HOST,
	port: Number(process.env.DB_PORT || 5432),
	database: process.env.DB_NAME,
	username: process.env.DB_USER,
	password: process.env.DB_PASSWORD
})

const API_KEY = process.env.TETRAIS_API_KEY
if (!API_KEY) throw new Error('TETRAIS_API_KEY missing')

const normalize = s => String(s || '').toLowerCase().replace(/['"]/g, '').trim()

const toNumber = v => {
	if (v == null) return null
	const n = parseFloat(
		String(v)
			.replace(/\s/g, '')
			.replace(',', '.')
			.replace(/[^0-9.\-]/g, '')
	)
	return isNaN(n) ? null : n
}

function findMatchedBrand(apiName) {
	const n = normalize(apiName)
	return brands.find(b => n.startsWith(normalize(b.name)))
}

async function safeJsonFetch(url) {
	const r = await fetch(url)
	const t = await r.text()
	try { return JSON.parse(t) }
	catch { throw new Error(`Not JSON: ${t.slice(0, 200)}`) }
}

function extractSpecs(item) {
	const values = item['ДопРеквизиты'] || {}
	const names = item['ДопРеквизитыНаименование'] || {}

	const specs = {
		weight: null, width: null, height: null, depth: null,
		power: null, color: null, volume: null,
		noise_level: null, energy_class: null,
		country: null, warranty: null
	}

	for (const key in values) {
		const value = values[key]
		const label = (names[key] || key || '').toLowerCase()

		if (label.includes('вес')) specs.weight = toNumber(value)
		else if (label.includes('ширин')) specs.width = toNumber(value)
		else if (label.includes('высот')) specs.height = toNumber(value)
		else if (label.includes('глубин')) specs.depth = toNumber(value)
		else if (label.includes('мощност')) specs.power = toNumber(value)
		else if (label.includes('цвет')) specs.color = value ?? null
		else if (label.includes('объем')) specs.volume = toNumber(value)
		else if (label.includes('шума')) specs.noise_level = toNumber(value)
		else if (label.includes('энерг')) specs.energy_class = value ?? null
		else if (label.includes('стран')) specs.country = value ?? null
		else if (label.includes('гарант')) specs.warranty = toNumber(value)
	}

	if (!specs.volume && item['Объем']) specs.volume = toNumber(item['Объем'])
	if (!specs.weight && item['Вес']) specs.weight = toNumber(item['Вес'])

	return specs
}

function extractPrices(priceRows) {
	const map = new Map()

	for (const p of priceRows) {
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

	console.log('Sync:', brand.name, '| API:', apiBrand.NAME)

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
			external_id: id,
			brand_id: String(apiBrand.ID),
			brand_name: brand.name,
			brand_api_name: apiBrand.NAME,
			name: item['РабочееНаименование'] ?? null,
			description: item['ТекстовоеОписание'] ?? null,
			sku: item['Артикул'] ?? null,
			price_rrc: prices.price_rrc,
			price_opt: prices.price_opt,
			price_ric: prices.price_ric,
			category: item['ГруппаАналитическогоУчета'] ?? null,
			product_type: item['ЦеноваяГруппа'] ?? null,
			weight: specs.weight,
			width: specs.width,
			height: specs.height,
			depth: specs.depth,
			power: specs.power,
			color: specs.color,
			volume: specs.volume,
			noise_level: specs.noise_level,
			energy_class: specs.energy_class,
			country: specs.country,
			warranty: specs.warranty,
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
			brand_id = excluded.brand_id,
			brand_name = excluded.brand_name,
			brand_api_name = excluded.brand_api_name,
			name = excluded.name,
			description = excluded.description,
			sku = excluded.sku,
			price_rrc = excluded.price_rrc,
			price_opt = excluded.price_opt,
			price_ric = excluded.price_ric,
			category = excluded.category,
			product_type = excluded.product_type,
			weight = excluded.weight,
			width = excluded.width,
			height = excluded.height,
			depth = excluded.depth,
			power = excluded.power,
			color = excluded.color,
			volume = excluded.volume,
			noise_level = excluded.noise_level,
			energy_class = excluded.energy_class,
			country = excluded.country,
			warranty = excluded.warranty,
			raw = excluded.raw,
			updated_at = now()
	`

	const ids = rows.map(r => r.external_id)

	await sql`
		delete from products
		where brand_id = ${String(apiBrand.ID)}
		and external_id not in ${sql(ids)}
	`

	console.log('Done:', rows.length)
}

async function main() {
	const apiBrands = await safeJsonFetch(`https://tetrasis-bt.ru/exch_api.php?CODE=${API_KEY}`)
	for (const b of apiBrands) await syncBrand(b)
	await sql.end()
}

main()