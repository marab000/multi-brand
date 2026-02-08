import 'dotenv/config'
import fetch from 'node-fetch'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const API_KEY = process.env.TETRAIS_API_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const BRANDS = JSON.parse(fs.readFileSync('./brands.json'))

function getFieldLike(obj, keyPart) {
	if (!obj) return null
	const key = Object.keys(obj).find(k =>
		k.toLowerCase().includes(keyPart.toLowerCase())
	)
	return key ? obj[key] : null
}

function toNumber(val) {
	if (!val) return null
	const cleaned = String(val).replace(',', '.').replace(/[^\d.]/g, '')
	const num = parseFloat(cleaned)
	return isNaN(num) ? null : num
}

async function syncBrand(brandId) {
	console.log(SUPABASE_URL)
	console.log(SUPABASE_KEY)
	console.log(API_KEY)

	console.log(`SYNC BRAND ${brandId}`)
	const qwe = `https://tetrasis-bt.ru/download/${API_KEY}/${brandId}/0/`;
	console.log(qwe);

	const products = await fetch(
		`https://tetrasis-bt.ru/download/${API_KEY}/${brandId}/0/`
	).then(r =>
		r.json()
	)

	const prices = await fetch(
		`https://tetrasis-bt.ru/download/${API_KEY}/${brandId}/2/`
	).then(r => r.json())

	const rrcPrices = prices
		.filter(p => p['ВидЦены'] === 'РРЦ')
		.map(p => ({
			id: String(p['НоменклатураID']),
			price: toNumber(p['Цена'])
		}))

	for (const item of products) {
		const extras = item['ДопРеквизиты'] || {}

		const width = getFieldLike(extras, 'Ширина')
		const height = getFieldLike(extras, 'Высота')
		const length = getFieldLike(extras, 'Глубина')

		const rrc = rrcPrices.find(p => p.id.includes(String(item.ID)))

		const data = {
			external_id: item.ID,
			brand_id: brandId,
			name: item['РабочееНаименование'],
			sku: item['Артикул'],
			description: item['ТекстовоеОписание'],
			category: item['ГруппаАналитическогоУчета'],
			product_type: item['ЦеноваяГруппа'],
			price: rrc?.price ?? null,
			color: extras['Цвет'] ?? null,
			weight: toNumber(item['Вес']),
			width: toNumber(width),
			height: toNumber(height),
			length: toNumber(length),
			raw: item
		}

		const { error } = await supabase
			.from('products')
			.upsert(data, { onConflict: 'external_id' })

		if (error) {
			console.error('UPSERT ERROR', item.ID, error.message)
		}
	}
}

async function main() {
	for (const brand of BRANDS) {
		await syncBrand(brand)
	}
	console.log('DONE')
}

main()