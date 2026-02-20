// sync images from tetrais api, incorrect data. #for later

import 'dotenv/config'
import postgres from 'postgres'
import fs from 'fs-extra'
import path from 'path'
import unzipper from 'unzipper'
import brands from './brands.json'with{type: 'json'}

const sql = postgres({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 5432), database: process.env.DB_NAME, username: process.env.DB_USER, password: process.env.DB_PASSWORD })

const API = process.env.TETRAIS_API_KEY
if (!API) throw new Error('no api key')

const ROOT = path.resolve('static/images')

const norm = s => String(s || '').toLowerCase().replace(/'/g, '').replace(/[^a-z0-9а-яё]+/gi, ' ').trim()
const slug = n => norm(n).split(' ')[0]

async function json(url) { const r = await fetch(url); return r.json() }

async function download(url, file) { const r = await fetch(url); if (!r.ok) throw new Error('zip'); await fs.writeFile(file, Buffer.from(await r.arrayBuffer())) }

function indexOfFile(f) { const m = f.match(/_(\d+)\./); return m ? Number(m[1]) : 9999 }

async function sync(apiBrand, brand) {
	const s = slug(brand.name)
	console.log('\n===', brand.name)
	const products = await sql`select id,external_id from products where external_id is not null and lower(name) like ${s + '%'}`
	if (!products.length) { console.log('no products'); return }
	const zip = `/tmp/${s}.zip`
	await download(`https://tetrasis-bt.ru/download/${API}/${apiBrand.ID}/3/`, zip)
	const dir = path.join(ROOT, s, 'api')
	await fs.ensureDir(dir)
	await fs.createReadStream(zip).pipe(unzipper.Extract({ path: dir })).promise()
	await fs.remove(zip)
	let files = (await fs.readdir(dir)).filter(f => /\.(jpg|jpeg|png)$/i.test(f))
	files = files.sort((a, b) => indexOfFile(a) - indexOfFile(b))
	let ins = 0, skip = 0
	for (let i = 0; i < files.length; i++) {
		const f = files[i]
		const ext = f.split('_')[0]
		const p = products.find(x => String(x.external_id) === ext)
		if (!p) { skip++; continue }
		const url = `/images/${s}/api/${f}`
		const position = i + 1
		const r = await sql`
			insert into product_images(product_id,url,position,source)
			values(${p.id},${url},${position},'api')
			on conflict do nothing
			returning id
			`
		if (r.length) ins++; else skip++
	}
	console.log('Saved:', ins, 'Skipped:', skip)
}

async function main() {
	const apiBrands = await json(`https://tetrasis-bt.ru/exch_api.php?CODE=${API}`)
	for (const ab of apiBrands) {
		const b = brands.find(x => norm(ab.NAME).startsWith(norm(x.name)))
		if (b) await sync(ab, b)
	}
	await sql.end()
}

main()
