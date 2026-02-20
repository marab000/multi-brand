import 'dotenv/config'
import postgres from 'postgres'
import brands from './brands.json' with { type: 'json' }

const sql = postgres({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 5432), database: process.env.DB_NAME, username: process.env.DB_USER, password: process.env.DB_PASSWORD })

const API_KEY = process.env.TETRAIS_API_KEY
if (!API_KEY) throw new Error('TETRAIS_API_KEY missing')

const normalize = s => String(s || '').toLowerCase().replace(/['"]/g, '').trim()
const toNumber = v => { if (!v) return null; const n = parseFloat(String(v).replace(/\s/g, '').replace(',', '.')); return isNaN(n) ? null : n }

function findMatchedBrand(apiName) { const n = normalize(apiName); return brands.find(b => n.startsWith(normalize(b.name))) }

async function safeJsonFetch(url) { const r = await fetch(url); const t = await r.text(); try { return JSON.parse(t) } catch { throw new Error(`Not JSON: ${t.slice(0, 200)}`) } }

function extractSpecs(item) { const v = item['ДопРеквизиты'] || {}; const n = item['ДопРеквизитыНаименование'] || {}; let weight = null, width = null, height = null, depth = null, power = null, color = null; for (const k in v) { const val = v[k]; const label = (n[k] || '').toLowerCase(); if (label.includes('вес')) weight = toNumber(val); if (label.includes('ширин')) width = toNumber(val); if (label.includes('высот')) height = toNumber(val); if (label.includes('глубин')) depth = toNumber(val); if (label.includes('мощност')) power = toNumber(val); if (label.includes('цвет')) color = val } return { weight, width, height, depth, power, color } }

async function syncBrand(apiBrand) {

	const brand = findMatchedBrand(apiBrand.NAME)
	if (!brand) return

	console.log('Sync:', brand.name)

	const products = await safeJsonFetch(`https://tetrasis-bt.ru/download/${API_KEY}/${apiBrand.ID}/0/`)
	const prices = await safeJsonFetch(`https://tetrasis-bt.ru/download/${API_KEY}/${apiBrand.ID}/2/`)

	const priceMap = new Map()
	for (const p of prices) { const id = String(p['НоменклатураID']); const price = toNumber(p['Цена']); if (price) priceMap.set(id, price) }

	const rows = []

	for (const item of products) {

		const id = String(item.ID)
		const price = priceMap.get(id)
		if (!price) continue

		const specs = extractSpecs(item)

		rows.push({
			external_id: id,
			brand_id: String(apiBrand.ID),
			brand_name: brand.name,
			name: item['РабочееНаименование'],
			sku: item['Артикул'] || null,
			price,
			category: item['ГруппаАналитическогоУчета'] || null,
			product_type: item['ЦеноваяГруппа'] || null,
			weight: specs.weight,
			width: specs.width,
			height: specs.height,
			length: specs.depth,
			color: specs.color,
			power: specs.power,
			raw: sql.json(item)
		})

	}

	if (!rows.length) { console.log('No rows'); return }

	await sql`
insert into products ${sql(rows)}
on conflict(external_id)
do update set
brand_id=excluded.brand_id,
brand_name=excluded.brand_name,
name=excluded.name,
sku=excluded.sku,
price=excluded.price,
category=excluded.category,
product_type=excluded.product_type,
weight=excluded.weight,
width=excluded.width,
height=excluded.height,
length=excluded.length,
color=excluded.color,
power=excluded.power,
raw=excluded.raw,
updated_at=now()
`

	const ids = rows.map(r => r.external_id)

	await sql`
delete from products
where brand_id=${String(apiBrand.ID)}
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
