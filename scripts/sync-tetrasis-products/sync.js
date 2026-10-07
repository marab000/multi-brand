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
import { normalizeSpecs } from './spec-normalizer.js'
const SOURCE = 'tetrasis-api'
const LOG = 'scripts/sync-tetrasis-products/sync.log'
const BRANDS_KEY = 'tetrasis_brands'
const STATE_KEY = 'tetrasis_sync_state'
const EXCLUDED_KEY = 'tetrasis_excluded_categories'
// SYNC_DRY_RUN=1 — только проверить связь и обновить список брендов поставщика, товары не трогаем
const DRY_RUN = process.env.SYNC_DRY_RUN === '1'
// защита от дурака: поставщик моргнул — товары источника не должны вымирать пачками
const SHRINK_LIMIT = 0.5 // бренд: пришло меньше половины того, что в базе — удаление «лишних» пропускаем
const MASS_DELETE_SHARE = 0.3 // общее: одна чистка не может снести больше 30% товаров источника
const PRODUCT_FLOOR = 3000 // в базе должно остаться минимум столько товаров источника, иначе синк падает с ошибкой
const API_KEY = process.env.TETRAIS_API_KEY
if (!API_KEY) throw new Error('TETRAIS_API_KEY missing')
const sql = postgres({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 5432), database: process.env.DB_NAME, username: process.env.DB_USER, password: process.env.DB_PASSWORD })
const now = () => new Date().toISOString()
const normalizeCompare = s => String(s || '').toLowerCase().replace(/['"]/g, '').trim()
const cleanBrand = s => String(s || '').replace(/['"]/g, '').trim()
// слаг — та же логика, что src/lib/utils/slugify.ts (история слагов и карточка должны совпадать)
const SLUG_MAP = { а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'c',ч:'ch',ш:'sh',щ:'sch',ы:'y',э:'e',ю:'yu',я:'ya' }
function slugify(str) {
	return String(str).toLowerCase().split('').map(c => SLUG_MAP[c] ?? c).join('').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
const escapeRegExp = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// включённые бренды подгружаются из настроек админки в main(), до этого — brands.json
let enabledBrands = brands.map(b => cleanBrand(b))
// исключённые категории — из настроек админки («Тетрис»), до этого — excluded-categories.json
let excludedCatSet = new Set()
async function log(...a) {
	const line = `${now()} ${a.join(' ')}`
	console.log(line)
	await (await import('fs-extra')).default.appendFile(LOG, line + '\n')
}
function findMatchedBrand(apiName) {
	const n = normalizeCompare(apiName)
	return enabledBrands.find(b => n.startsWith(normalizeCompare(b)))
}
// слияние списков брендов без дублей по нижнему регистру (наши канонические имена приоритетнее)
function mergeBrandLists(primary, secondary) {
	const byKey = new Map()
	for (const b of [...primary, ...secondary]) {
		const clean = cleanBrand(b)
		if (!clean) continue
		const key = normalizeCompare(clean)
		if (!byKey.has(key)) byKey.set(key, clean)
	}
	return [...byKey.values()]
}
async function getSetting(key) {
	const rows = await sql`select value from settings where key=${key} limit 1`
	try { return JSON.parse(rows[0]?.value || 'null') } catch { return null }
}
async function putSetting(key, value) {
	const json = JSON.stringify(value)
	await sql`insert into settings (key, value, updated_at) values (${key}, ${json}, now()) on conflict (key) do update set value=${json}, updated_at=now()`
}
async function setSyncState(patch) {
	const cur = (await getSetting(STATE_KEY)) || {}
	await putSetting(STATE_KEY, { ...cur, ...patch })
}
// включённые бренды берём из настроек админки («Тетрис» в /admin), brands.json — запасной вариант
// исключённые категории: настройки админки — источник правды, json — запасной вариант
async function loadExcludedCategories() {
	try {
		const v = await getSetting(EXCLUDED_KEY)
		if (Array.isArray(v)) return { list: v.map(s => String(s).trim()).filter(Boolean), source: 'settings' }
	} catch {}
	return { list: (excludedCategories.categories ?? []).map(s => String(s).trim()).filter(Boolean), source: 'json' }
}
async function loadBrandConfig() {
	const fallback = mergeBrandLists(brands, [])
	try {
		const cfg = await getSetting(BRANDS_KEY)
		if (cfg && Array.isArray(cfg.enabled)) {
			return {
				all: mergeBrandLists(Array.isArray(cfg.all) ? cfg.all : [], fallback),
				enabled: mergeBrandLists(cfg.enabled, [])
			}
		}
	} catch {}
	return { all: fallback, enabled: fallback }
}
async function safeJsonFetch(url, retries = 3) {
	// сеть моргает — пробуем несколько раз прежде чем сдаться
	for (let attempt = 1; attempt <= retries; attempt++) {
		try {
			const r = await fetch(url, { signal: AbortSignal.timeout(30000) })
			const t = await r.text()
			try { return JSON.parse(t) }
			catch {
				await log('API_ERROR', url, t.slice(0, 500))
				return null
			}
		} catch (e) {
			await log('API_RETRY', `${attempt}/${retries}`, url, e.message)
			if (attempt < retries) await new Promise(res => setTimeout(res, 3000 * attempt))
		}
	}
	await log('API_FAILED', url)
	return null
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
	if (!brand) return false
	const cleanName = cleanBrand(brand)
	await log('SYNC_BRAND', cleanName, 'api:', apiBrand.NAME)
	const products = await safeJsonFetch(`https://tetrasis-bt.ru/download/${API_KEY}/${apiBrand.ID}/0/`)
	const pricesRaw = await safeJsonFetch(`https://tetrasis-bt.ru/download/${API_KEY}/${apiBrand.ID}/2/`)
	if (!products || !pricesRaw) {
		await log('SKIP_BRAND', apiBrand.NAME)
		return false
	}
	const priceMap = extractPrices(pricesRaw)
	// Тип для названия: product_type как есть («Комбинированная плита» → «... комбинированная плита»).
	// Правила по подстрокам дали ложь: «с-ПЛИТ-система» → «плита», «Кофеварка» → «кофемашина».
const TYPE_OVERRIDES = {
	'Сплит-система': 'кондиционер',
	'Мобильный кондиционер': 'кондиционер',
	'Минимойка бытовая электрическая для авто': 'минимойка',
	'Аксессуары для мбт': null,
	'Багеты и планки для вытяжек': null
}
function shortType(productType) {
	const t = String(productType ?? '').trim()
	if (!t) return ''
	if (t in TYPE_OVERRIDES) return TYPE_OVERRIDES[t]
	return t.charAt(0).toLowerCase() + t.slice(1)
}
function enrichName(name, productType, color) {
	let result = name
	const short = shortType(productType)
	// уже содержит тип — не дублируем
	if (short && !new RegExp(escapeRegExp(short), 'i').test(result)) result = `${result} ${short}`
	// цвет из характеристик в конец: «Gorenje GS520E15S отдельностоящая посудомоечная машина, серебристый»
	if (color && !new RegExp(escapeRegExp(color), 'i').test(result)) result = `${result}, ${color}`
	return result
}

const rows = []
	let skippedByCategory = 0
	for (const item of products) {
		const id = String(item.ID)
		const prices = priceMap.get(id)
		if (!prices || !(prices.price_rrc || prices.price_opt || prices.price_ric)) continue
		const rawCategory = item['ГруппаАналитическогоУчета'] ?? null
		// исключённые категории не доезжают до базы (управляются в админке «Тетрис»)
		if (rawCategory && excludedCatSet.has(String(rawCategory).trim().toLowerCase())) {
			skippedByCategory++
			continue
		}
		const rawType = item['ЦеноваяГруппа'] ?? null
		const catalog = resolveCatalog(rawCategory, rawType)
		// спеки сразу нормализуем — мусор поставщика не доезжает до базы
		const specs = normalizeSpecs(extractSpecs(item)).specs
		const displayName = enrichName(item['РабочееНаименование'] ?? '', rawType, specs['Цвет'] ?? null)
		rows.push({
			external_id: id,
			source: SOURCE,
			brand: sql.json({ name: cleanName, api: apiBrand.NAME }),
			name: displayName,
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
			specs: sql.json(specs),
			raw: sql.json({ ...item, imported_from: SOURCE, imported_at: now() })
		})
	}
	if (!rows.length) {
		await log('NO_ROWS_WITH_PRICE', cleanName)
		return false
	}
	// история слагов: у товаров, чьё имя поменялось, запоминаем старый слаг — старые ссылки 301-ят
	const oldRows = await sql`
		select id, external_id, name from products
		where source=${SOURCE} and external_id in ${sql(rows.map(r => r.external_id))}`
	const oldByName = new Map(oldRows.map(r => [r.external_id, r]))
	const slugRenames = []
	for (const r of rows) {
		const old = oldByName.get(r.external_id)
		const oldSlug = old?.name && old.name !== r.name ? slugify(old.name) : null
		if (oldSlug) slugRenames.push({ product_id: old.id, slug: oldSlug })
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
	if (slugRenames.length) {
		await sql`
			insert into product_slug_history ${sql(slugRenames)}
			on conflict (product_id, slug) do nothing`
		await log('SLUG_HISTORY', 'записано старых слагов:', slugRenames.length)
	}
	const ids = rows.map(r => r.external_id)
	// защита: если в базе бренда в разы больше, чем пришло (обрезанная выдача API),
	// снос «лишних» пропускаем — доедет следующим нормальным прогоном.
	// Базу считаем без исключённых категорий — их отсутствие в фиде не «сжатие».
	const excludedArr = [...excludedCatSet]
	const [{ n: brandCount }] = excludedArr.length
		? await sql`
			select count(*)::int as n from products
			where source=${SOURCE}
			and brand->>'api'=${String(apiBrand.NAME)}
			and (category is null or LOWER(TRIM(COALESCE(category, ''))) not in ${sql(excludedArr)})`
		: await sql`
			select count(*)::int as n from products
			where source=${SOURCE} and brand->>'api'=${String(apiBrand.NAME)}`
	if (excludedArr.length && brandCount === 0) {
		// у бренда остались только исключённо-категорийные товары — их вычистит
		// чистящая проводка исключений, per-brand delete не нужен
	} else if (brandCount && rows.length < brandCount * SHRINK_LIMIT) {
		await log('SUSPICIOUS_SHRINK', cleanName, `в базе ${brandCount}, пришло ${rows.length} — удаление пропущено`)
	} else {
		await sql`
			delete from products
			where source=${SOURCE}
			and brand->>'api'=${String(apiBrand.NAME)}
			and external_id not in ${sql(ids)}
		`
	}
	await log('DONE_BRAND', cleanName, 'rows:', rows.length, skippedByCategory ? `(категории пропущено: ${skippedByCategory})` : '')
	return true
}
// защита от дурака: массовую чистку считаем и удаляем в транзакции — если под раздачу
// попало больше MASS_DELETE_SHARE товаров источника, откатываем и валим синк с ошибкой в админку
async function guardedDelete(label, buildCond) {
	return sql.begin(async tx => {
		const cond = buildCond(tx)
		const [total] = await tx`select count(*)::int as n from products where source=${SOURCE}`
		const [doomed] = await tx`select count(*)::int as n from products where source=${SOURCE} and ${cond}`
		if (total.n && doomed.n > total.n * MASS_DELETE_SHARE) {
			throw new Error(`ЗАЩИТА ${label}: под удаление ${doomed.n} из ${total.n} товаров (> ${Math.round(MASS_DELETE_SHARE * 100)}%) — откат, синк прерван`)
		}
		return await tx`delete from products where source=${SOURCE} and ${cond} returning id`
	})
}
async function removeExcludedCategories() {
	// чистящая проводка: товары, попавшие в базу до включения исключения (или при
	// выключенном фильтре на входе). На входе они уже не доезжают — после первого
	// прогона здесь всегда 0.
	const { category_product_types = {} } = excludedCategories
	let removed = 0
	if (excludedCatSet.size) {
		const list = [...excludedCatSet]
		removed += (
			await guardedDelete('excluded-categories', tx =>
				tx`(LOWER(TRIM(COALESCE(category, ''))) IN ${sql(list)})`)
		).length
	}
	let query = sql``
	let first = true
	for (const [category, types] of Object.entries(category_product_types)) {
		if (!types.length) continue
		const condition = sql`(category = ${category} and product_type = ANY(${sql.array(types)}))`
		query = first ? sql`${condition}` : sql`${query} OR ${condition}`
		first = false
	}
	if (!first) removed += (await guardedDelete('excluded-categories-types', tx => tx`(${query})`)).length
	await log('EXCLUDED_REMOVED', 'товаров:', removed)
}
// бренд выключили в админке (или убрали из brands.json) → его товары вычищаем из базы
async function removeStaleBrands() {
	const keep = enabledBrands.map(b => cleanBrand(b))
	if (!keep.length) {
		await log('STALE_BRANDS_SKIPPED', 'пустой список включённых брендов — ничего не удаляю')
		return
	}
	const removed = await guardedDelete('stale-brands', tx =>
		tx`(brand->>'name' is null or brand->>'name' not in ${sql(keep)})`)
	if (removed.length) await log('STALE_BRANDS_REMOVED', removed.map(r => r.id).length + ' товаров')
	else await log('STALE_BRANDS_NONE')
}
async function main() {
	const fs = (await import('fs-extra')).default
	await fs.writeFile(LOG, '')
	await setSyncState({ status: 'running', startedAt: now(), finishedAt: null, source: process.env.SYNC_SOURCE || 'cli', error: null })
	// история слагов (та же таблица, что создаёт hooks.server.ts на сайте)
	await sql`create table if not exists product_slug_history (
		product_id uuid not null references products(id) on delete cascade,
		slug text not null,
		created_at timestamptz not null default now(),
		primary key (product_id, slug))`
	// защита: синхронизируем только живую базу — минимум PRODUCT_FLOOR товаров источника
	const [{ n: startCount }] = await sql`select count(*)::int as n from products where source=${SOURCE}`
	if (startCount < PRODUCT_FLOOR) {
		throw new Error(`Защита: для синхронизации должно быть минимум ${PRODUCT_FLOOR} товаров, в базе ${startCount}. Условие не выполнено`)
	}
	const cfg = await loadBrandConfig()
	enabledBrands = cfg.enabled
	const excluded = await loadExcludedCategories()
	excludedCatSet = new Set(excluded.list.map(c => c.toLowerCase()))
	await log('CONFIG', 'enabled:', enabledBrands.length, 'known:', cfg.all.length,
		'| исключённых категорий:', excludedCatSet.size, `(${excluded.source})`,
		DRY_RUN ? 'DRY_RUN' : '')
	const apiBrands = await safeJsonFetch(`https://tetrasis-bt.ru/exch_api.php?CODE=${API_KEY}`)
	if (!apiBrands) throw new Error('Brands list fetch failed')
	// unmatched считаем ДО слияния: бренды поставщика, которые не сопоставились
	// ни с одним нашим известным именем
	const knownBefore = new Set(cfg.all.map(normalizeCompare))
	const unmatched = apiBrands.map(b => cleanBrand(b?.NAME)).filter(n => n && ![...knownBefore].some(k => normalizeCompare(n).startsWith(k)))
	// общий список брендов поставщика оседает в настройках — его показывает админка
	const all = mergeBrandLists(cfg.all, apiBrands.map(b => b?.NAME))
	await putSetting(BRANDS_KEY, { all, enabled: enabledBrands })
	await log('UNMATCHED_API_BRANDS', unmatched.length ? unmatched.join(', ') : 'none')
	if (DRY_RUN) {
		await setSyncState({ status: 'done', finishedAt: now(), brandsDone: 0, brandsTotal: apiBrands.length, unmatched })
		await log('FINISHED', 'dry-run, брендов у поставщика:', apiBrands.length)
		await sql.end()
		return
	}
	let done = 0
	for (const b of apiBrands) {
		try { if (await syncBrand(b)) done++ }
		catch (e) { await log('FAILED_BRAND', b?.NAME, e.stack || e.message) }
	}
	await removeExcludedCategories()
	await removeStaleBrands()
	// защита: чистки не должны опустить базу ниже пола
	const [{ n: finalCount }] = await sql`select count(*)::int as n from products where source=${SOURCE}`
	if (finalCount < PRODUCT_FLOOR) {
		throw new Error(`Защита: после синхронизации в базе ${finalCount} товаров, минимум ${PRODUCT_FLOOR}. Условие не выполнено`)
	}
	await setSyncState({ status: 'done', finishedAt: now(), brandsDone: done, brandsTotal: apiBrands.length, unmatched })
	await sql.end()
	await log('FINISHED', `синк выполнен: ${done} из ${apiBrands.length} брендов`)
}
main().catch(async e => {
	await setSyncState({ status: 'failed', finishedAt: now(), error: String(e.stack || e.message).slice(0, 1000) }).catch(() => null)
	await log('FATAL', e.stack || e.message).catch(() => null)
	await sql.end().catch(() => null)
	process.exit(1)
})