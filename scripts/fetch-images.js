import 'dotenv/config'
import puppeteer from 'puppeteer'
import postgres from 'postgres'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import fs from 'fs-extra'
import path from 'path'
import { v4 as uuid } from 'uuid'

// ==================== CONFIG / ENV ====================
const MODE = 'missing'
const THREADS = 1
const BASE = 'https://tetrasis-bt.ru'
const LOG = path.resolve('scripts/fetch-images.log')
const DELAY = 200

// Database
const sql = postgres({
	host: process.env.DB_HOST,
	port: Number(process.env.DB_PORT || 5432),
	database: process.env.DB_NAME,
	username: process.env.DB_USER,
	password: process.env.DB_PASSWORD
})

// Reg.ru S3
var qwe = process.env.S3_ENDPOINT;
console.log(qwe);
const s3 = new S3Client({
	region: 'reg',
	endpoint: process.env.S3_ENDPOINT,       // https://s3.eu-central-1.reg.ru
	credentials: {
		accessKeyId: process.env.S3_ACCESS_KEY,
		secretAccessKey: process.env.S3_SECRET_KEY
	},
	forcePathStyle: true
})
const BUCKET = process.env.S3_BUCKET

// ==================== UTILS ====================
const sleep = ms => new Promise(r => setTimeout(r, ms))
const now = () => new Date().toISOString()
async function log(...a) { const line = now() + ' ' + a.join(' '); console.log(line); await fs.appendFile(LOG, line + '\n') }
function slug(name) { return name.toLowerCase().replace(/\s+/g, '_') }
function brand(name) { return name.split(' ')[0].toLowerCase() }

async function uploadToS3(buffer, key) {
	await s3.send(new PutObjectCommand({
		Bucket: BUCKET,
		Key: key,
		Body: buffer,
		ACL: 'public-read',
		ContentType: 'image/jpeg'
	}))
	return `${process.env.S3_ENDPOINT.replace(/\/$/, '')}/${BUCKET}/${key}`
}

async function deleteFromS3(key) {
	await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
}

// ==================== IMAGE HANDLING ====================
async function download(url) {
	const r = await fetch(url)
	if (!r.ok) throw new Error('download ' + r.status)
	return Buffer.from(await r.arrayBuffer())
}

async function getImages(page, url) {
	await log('OPEN', url)
	await page.goto(url, { waitUntil: 'networkidle2' })
	if (!await page.$('.item_slider')) return []
	await page.waitForSelector('.item_slider ul li', { timeout: 10000 })
	return await page.$$eval('.item_slider ul li', lis =>
		lis.filter(li => li.id && li.id.startsWith('photo-'))
			.map(li => li.querySelector('a.popup_link')?.href)
			.filter(Boolean)
	)
}

async function resolveDirect(page, name) {
	const url = `${BASE}/product/${slug(name)}/`
	await page.goto(url, { waitUntil: 'networkidle2' })
	if (await page.$('.item_slider')) { await log('DIRECT OK', url); return url }
	await log('DIRECT FAIL')
	return null
}

async function resolveSearch(page, name) {
	await log('SEARCH PAGE', name)
	const searchUrl = BASE + '/search/?q=' + encodeURIComponent(name)
	await page.goto(searchUrl, { waitUntil: 'networkidle2' })
	await page.waitForSelector('.catalog-item a,.item-title a', { timeout: 15000 }).catch(() => null)
	const href = await page.evaluate(name => {
		const links = [...document.querySelectorAll('.catalog-item a,.item-title a')]
		for (const a of links) {
			const text = a.textContent?.toLowerCase() || ''
			const href = a.getAttribute('href') || ''
			if (text.includes(name.toLowerCase()) || href.includes(name.toLowerCase())) return href
		}
		return links[0]?.getAttribute('href') || null
	}, name)
	if (href) { const full = BASE + href; await log('SEARCH OK', full); return full }
	await log('SEARCH FAIL')
	return null
}

// ==================== PROCESS PRODUCT ====================
async function processProduct(page, p) {
	await log('PRODUCT', p.name)
	let url = await resolveDirect(page, p.name)
	let images = []
	if (url) images = await getImages(page, url)
	if (!images.length) { url = await resolveSearch(page, p.name); if (url) images = await getImages(page, url) }
	if (!images.length) { await log('NO IMAGES', p.name); return }

	const b = brand(p.name)
	const existing = await sql`
		select source_url,url from product_images
		where product_id=${p.id} and source='fetch'
	`
	const map = new Map(existing.map(x => [x.source_url, x.url]))
	let pos = 1, newCount = 0, skipCount = 0

	for (const imgUrl of images) {
		if (map.has(imgUrl)) { skipCount++; pos++; continue }
		const id = uuid()
		const key = `products/${b}/${id}.jpg`
		const buffer = await download(imgUrl)
		const s3Url = await uploadToS3(buffer, key)
		await sql`
			insert into product_images(id,product_id,url,source,source_url,position)
			values(${id},${p.id},${s3Url},'fetch',${imgUrl},${pos})
		`
		newCount++; pos++; await sleep(DELAY)
	}

	await log('DONE', p.name, 'NEW', newCount, 'SKIP', skipCount)
}

// ==================== WORKER ====================
async function worker(browser, queue) {
	const page = await browser.newPage()
	while (true) {
		const p = queue.shift()
		if (!p) break
		try { await processProduct(page, p) }
		catch (e) { await log('ERROR', p.name, e.message) }
	}
	await page.close()
}

// ==================== MAIN ====================
async function main() {
	await fs.writeFile(LOG, '')
	const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] })
	let products
	if (MODE === 'missing') {
		products = await sql`
			select p.id,p.name from products p
			where not exists(select 1 from product_images pi where pi.product_id=p.id and pi.source='fetch')
			order by p.name
		`
	} else {
		products = await sql`select id,name from products order by name`
	}

	await log('TOTAL', products.length)
	const queue = [...products]
	const workers = []
	for (let i = 0; i < THREADS; i++) workers.push(worker(browser, queue))
	await Promise.all(workers)
	await browser.close()
	await sql.end()
	await log('FINISHED')
}

// ==================== DELETE IMAGE ====================
export async function deleteImage(url) {
	const key = url.split(`${BUCKET}/`)[1]
	if (!key) return
	await deleteFromS3(key)
}

main()