import 'dotenv/config'
import postgres from 'postgres'
import fs from 'fs-extra'
import path from 'path'
import { resolveCatalog } from '../../src/lib/server/categories.ts'
const ROOT = 'scripts/fetch-tetrasis-kits'
const INPUT_FILE = path.resolve(process.env.TETRASIS_KITS_INPUT || `${ROOT}/kits-data.jsonl`)
const LOG = path.resolve(`${ROOT}/import.log`)
const IMAGE_QUEUE = path.resolve(process.env.FETCH_IMAGES_QUEUE || 'scripts/fetch-tetrasis-images/image-queue.json')
const LIMIT = Number(process.env.TETRASIS_KITS_LIMIT || 0)
const DRY_RUN = process.env.TETRASIS_KITS_DRY_RUN !== 'false'
const KIT_CATEGORY = 'Встраиваемая техника'
const SOURCE = 'tetrasis-kit'
const sql = postgres({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 5432), database: process.env.DB_NAME, username: process.env.DB_USER, password: process.env.DB_PASSWORD })
const now = () => new Date().toISOString()
function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim() }
function toDbPrice(value) {
	const n = Number(value)
	return Number.isFinite(n) ? n / 1000 : null
}
function getBrandName(kit) {
	if (kit.brand?.name) return clean(kit.brand.name)
	const first = clean(kit.name).split(/\s+/)[0]
	return first || 'Tetrasis'
}
function kitExternalId(kit) { return `kit:${kit.external_id || kit.url}` }
function kitSpecs(kit) {
	const items = kit.kit_items || []
	const names = items.map((item, index) => `${index + 1}. ${item.matched_name || item.name || item.raw?.list_item?.name || ''}`).filter(Boolean)
	return { 'Состав комплекта': names.join(' + '), 'Количество товаров': String(names.length) }
}
function kitRaw(kit) { return { ...kit, imported_from: SOURCE, imported_at: now() } }
function itemRaw(kit, item, childProduct) { return { ...item, kit_name: kit.name, kit_external_id: kit.external_id, child_product_id: childProduct?.id || item.child_product_id || null, imported_from: SOURCE, imported_at: now() } }
async function log(...a) {
	const line = `${now()} ${a.join(' ')}`
	console.log(line)
	await fs.appendFile(LOG, line + '\n')
}
async function readKits() {
	if (!(await fs.pathExists(INPUT_FILE))) throw new Error(`File not found: ${INPUT_FILE}`)
	const content = await fs.readFile(INPUT_FILE, 'utf8')
	let kits = content.split('\n').map(line => line.trim()).filter(Boolean).map(line => JSON.parse(line))
	if (LIMIT > 0) kits = kits.slice(0, LIMIT)
	return kits
}
async function ensureKitItemsTable() {
	await sql`
		create table if not exists product_kit_items (
			id uuid primary key default gen_random_uuid(),
			kit_product_id uuid not null references products(id) on delete cascade,
			child_product_id uuid references products(id) on delete set null,
			child_external_id text,
			name text not null,
			brand jsonb,
			description text,
			price_rrc numeric,
			price_opt numeric,
			price_ric numeric,
			source_url text,
			preview_image text,
			position int not null default 0,
			specs jsonb,
			raw jsonb,
			created_at timestamptz not null default now(),
			updated_at timestamptz not null default now()
		)
	`
	await sql`create unique index if not exists product_kit_items_unique_position on product_kit_items(kit_product_id, position)`
	await sql`create index if not exists product_kit_items_kit_product_id_idx on product_kit_items(kit_product_id)`
	await sql`create index if not exists product_kit_items_child_product_id_idx on product_kit_items(child_product_id)`
}
async function findKitProduct(kit) {
	const rows = await sql`select id,name from products where external_id=${kitExternalId(kit)} limit 1`
	return rows[0] || null
}
async function findChildProduct(item) {
	if (item.child_product_id) {
		const rows = await sql`select id,name,external_id from products where id=${item.child_product_id} limit 1`
		if (rows[0]) return { ...rows[0], match: item.match || 'child_product_id' }
	}
	const article = item.specs?.['Артикул'] || item.raw?.detail?.specs?.['Артикул']
	const name = clean(item.name || item.raw?.list_item?.name)
	const shortName = clean(item.raw?.list_item?.name || item.source_name)
	if (article) {
		const rows = await sql`select id,name,external_id from products where specs->>'Артикул'=${String(article)} limit 1`
		if (rows[0]) return { ...rows[0], match: 'article', article: String(article) }
	}
	if (name) {
		const rows = await sql`select id,name,external_id from products where name=${name} limit 1`
		if (rows[0]) return { ...rows[0], match: 'name' }
	}
	if (shortName && shortName !== name) {
		const rows = await sql`select id,name,external_id from products where name ilike ${`${shortName}%`} limit 1`
		if (rows[0]) return { ...rows[0], match: 'short_name' }
	}
	return null
}
async function inspectKits(kits) {
	let kitsExist = 0
	let kitsMissing = 0
	let itemsExist = 0
	let itemsMissing = 0
	const validKits = []
	await log(`START dryRun:${DRY_RUN} input:${INPUT_FILE} limit:${LIMIT || 'all'}`)
	for (const [index, kit] of kits.entries()) {
		const kitProduct = await findKitProduct(kit)
		if (kitProduct) kitsExist++
		else kitsMissing++
		let missingInKit = 0
		const resolvedItems = []
		await log(`${kitProduct ? 'KIT_EXISTS' : 'KIT_MISSING'} [${index + 1}/${kits.length}] ${kit.name} external:${kitExternalId(kit)} items:${kit.kit_items?.length || 0}`)
		for (const item of kit.kit_items || []) {
			const childProduct = await findChildProduct(item)
			if (childProduct) {
				itemsExist++
				resolvedItems.push({ ...item, child_product_id: childProduct.id, matched_name: childProduct.name, match: childProduct.match })
			} else {
				itemsMissing++
				missingInKit++
				await log(`ITEM_MISSING ${kit.name} item:${item.name || item.raw?.list_item?.name} article:${item.specs?.['Артикул'] || '-'}`)
			}
		}
		if (!kitProduct && missingInKit === 0 && resolvedItems.length) validKits.push({ ...kit, kit_items: resolvedItems })
		else if (!kitProduct && missingInKit > 0) await log(`KIT_SKIP_IMPORT ${kit.name} reason:item_missing missing:${missingInKit}`)
	}
	await log(`SUMMARY kits:${kits.length} kitsExist:${kitsExist} kitsMissing:${kitsMissing} itemsExist:${itemsExist} itemsMissing:${itemsMissing} validForImport:${validKits.length} dryRun:${DRY_RUN}`)
	return validKits
}
async function upsertKitProduct(kit) {
	const brandName = getBrandName(kit)
	const catalog = resolveCatalog(KIT_CATEGORY, kit.product_type)
	const rows = await sql`
		insert into products (
			external_id,
			source,
			brand,
			name,
			description,
			category,
			product_type,
			catalog_root_slug,
			catalog_root_name,
			catalog_group_slug,
			catalog_group_name,
			catalog_leaf_slug,
			catalog_leaf_name,
			price_rrc,
			price_opt,
			price_ric,
			specs,
			raw
		) values (
			${kitExternalId(kit)},
			${SOURCE},
			${sql.json({ name: brandName, api: kit.brand?.api || SOURCE })},
			${kit.name},
			${kit.description || null},
			${KIT_CATEGORY},
			${kit.product_type},
			${catalog.root?.slug ?? null},
			${catalog.root?.name ?? null},
			${catalog.group?.slug ?? null},
			${catalog.group?.name ?? null},
			${catalog.leaf?.slug ?? null},
			${catalog.leaf?.name ?? null},
			${toDbPrice(kit.price_rrc)},
			${toDbPrice(kit.price_rrc)},
			${toDbPrice(kit.price_rrc)},
			${sql.json(kitSpecs(kit))},
			${sql.json(kitRaw(kit))}
		)
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
		returning id
	`
	return rows[0].id
}
async function upsertKitItems(kitProductId, kit) {
	await sql`delete from product_kit_items where kit_product_id=${kitProductId}`
	for (const item of kit.kit_items || []) {
		const childProduct = await findChildProduct(item)
		if (!childProduct) throw new Error(`Child product not found during import: ${item.name}`)
		const brandName = clean(item.brand || childProduct.name.split(/\s+/)[0] || getBrandName(kit))
		await sql`
			insert into product_kit_items (
				kit_product_id,
				child_product_id,
				child_external_id,
				name,
				brand,
				description,
				price_rrc,
				price_opt,
				price_ric,
				source_url,
				preview_image,
				position,
				specs,
				raw
			) values (
				${kitProductId},
				${childProduct.id},
				${childProduct.external_id || null},
				${item.matched_name || childProduct.name},
				${sql.json({ name: brandName, api: SOURCE })},
				${item.description || null},
				${toDbPrice(item.price_rrc)},
				${toDbPrice(item.price_rrc)},
				${toDbPrice(item.price_rrc)},
				${item.url || null},
				${item.preview_image || null},
				${item.position || 0},
				${sql.json(item.specs || {})},
				${sql.json(itemRaw(kit, item, childProduct))}
			)
		`
	}
}
async function writeImageQueue(kits) {
	const items = []
	const names = new Set()
	for (const kit of kits) {
		if (!kit.name || names.has(kit.name)) continue
		names.add(kit.name)
		items.push({ name: kit.name, source: SOURCE })
	}
	await fs.ensureDir(path.dirname(IMAGE_QUEUE))
	await fs.writeJson(IMAGE_QUEUE, items, { spaces: 2 })
}
async function importKits(kits) {
	await ensureKitItemsTable()
	let imported = 0
	let itemCount = 0
	for (const kit of kits) {
		const kitProductId = await upsertKitProduct(kit)
		await upsertKitItems(kitProductId, kit)
		imported++
		itemCount += kit.kit_items?.length || 0
		await log(`OK ${imported}/${kits.length} ${kit.name} items:${kit.kit_items?.length || 0}`)
	}
	await writeImageQueue(kits)
	await log(`IMPORT_DONE kits:${imported} kitItems:${itemCount} imageQueue:${IMAGE_QUEUE}`)
}
async function main() {
	await fs.ensureDir(ROOT)
	await fs.writeFile(LOG, '')
	const kits = await readKits()
	const validKits = await inspectKits(kits)
	if (DRY_RUN) {
		await sql.end()
		await log('DRY_RUN_DONE')
		return
	}
	await importKits(validKits)
	await sql.end()
	await log(`DONE input:${INPUT_FILE} limit:${LIMIT || 'all'} imported:${validKits.length}`)
}
main().catch(async e => {
	await log('FATAL', e.stack || e.message).catch(() => null)
	await sql.end().catch(() => null)
	process.exit(1)
})