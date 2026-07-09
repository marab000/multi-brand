// Парсер grandex-aqua.ru (сайт на 1C-Bitrix, шаблон Aspro Premier).
// Сухой прогон: читает сайт, пишет products-data.jsonl и image-queue.json.
// НЕ пишет в БД и НЕ качает картинки в S3 — это отдельные фазы (import.js, fetch-images.js).
//
// Запуск:
//   node scripts/fetch-grandex-aqua/fetch.js
//
// Env (с дефолтами):
//   GRANDEX_BASE                — https://grandex-aqua.ru
//   FETCH_GRANDEX_THREADS       — 2
//   FETCH_GRANDEX_HEADLESS      — true (false для отладки с окном браузера)
//   FETCH_GRANDEX_ACTION_DELAY  — 800
//   FETCH_GRANDEX_PRODUCT_DELAY — 500
//   FETCH_GRANDEX_SECTION       — пусто (перебрать все) либо один путь из categories-map.json
import 'dotenv/config'
import puppeteer from 'puppeteer'
import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'
import { resolveCatalog } from '../../src/lib/server/categories.ts'
import categoriesMap from './categories-map.json' with { type: 'json' }
import brandsList from './brands.json' with { type: 'json' }

const SOURCE = 'grandex-aqua'
// Whitelist брендов: если карточка не матчит ни один — пропускаем.
// today = ['Grandex Aqua']; tomorrow = добавь строку в brands.json и перезапусти.
const ALLOWED_BRANDS = brandsList.map(b => String(b || '').trim().toLowerCase()).filter(Boolean)
// Все известные бренды сайта — для распознавания бренда в названии.
const KNOWN_BRANDS = ['Grandex Aqua', 'ALVEUS', 'INTERSTONE', 'Schock', 'Longer', 'Reginox', 'Blanco', 'Franke', 'Teka', 'Ruhens', 'Gidromix']
const BRAND = { name: 'Grandex Aqua', api: SOURCE } // fallback, если бренд не распознан
function detectBrand(name) {
  const lower = String(name || '').toLowerCase()
  for (const b of KNOWN_BRANDS) {
    if (lower.includes(b.toLowerCase())) return { name: b, api: SOURCE }
  }
  return BRAND
}
const BASE = process.env.GRANDEX_BASE || 'https://grandex-aqua.ru'
const __filename = fileURLToPath(import.meta.url)
const ROOT = path.dirname(__filename)
const THREADS = Number(process.env.FETCH_GRANDEX_THREADS || 2)
const HEADLESS = process.env.FETCH_GRANDEX_HEADLESS !== 'false'
const ACTION_DELAY = Number(process.env.FETCH_GRANDEX_ACTION_DELAY || 800)
const PRODUCT_DELAY = Number(process.env.FETCH_GRANDEX_PRODUCT_DELAY || 500)
const ONLY_SECTION = process.env.FETCH_GRANDEX_SECTION || ''
const PRODUCTS_FILE = path.resolve(`${ROOT}/products-data.jsonl`)
const QUEUE_FILE = path.resolve(`${ROOT}/image-queue.json`)
const LOG = path.resolve(`${ROOT}/fetch.log`)

const colors = { green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', blue: '\x1b[36m', gray: '\x1b[90m', reset: '\x1b[0m' }
const sleep = ms => new Promise(r => setTimeout(r, ms))
const delay = (ms = ACTION_DELAY) => sleep(ms)
const now = () => new Date().toISOString()
function stripAnsi(value) { return String(value).replace(/\x1b\[[0-9;]*m/g, '') }
async function writeLog(line) { console.log(line); await fs.appendFile(LOG, stripAnsi(line) + '\n') }
async function logLine(color, ...a) { await writeLog(`${colors.gray}${now()}${colors.reset} ${color}${a.join(' ')}${colors.reset}`) }
async function logInfo(...a) { await logLine(colors.blue, ...a) }
async function logSuccess(...a) { await logLine(colors.green, ...a) }
async function logWarn(...a) { await logLine(colors.yellow, ...a) }
async function logError(...a) { await logLine(colors.red, ...a) }

// Канонический URL товара — берём из карточки и обрезаем ?oid=... (он выбирает оффер).
function canonicalizeUrl(href) {
  if (!href) return null
  try {
    const u = new URL(href, BASE)
    u.search = ''
    return u.pathname
  } catch { return null }
}
function absUrl(href) {
  if (!href) return null
  try { return new URL(href, BASE).href } catch { return null }
}
// Чистое число из строки цены "19 500 ₽" → 19500
function parsePrice(text) {
  if (!text) return null
  const m = String(text).replace(/[^\d.,]/g, '').replace(/[.,](?=\d{3})/g, '').replace(/[.,].*$/, '')
  const n = Number(m)
  return Number.isFinite(n) && n > 0 ? n : null
}
// Определяем productType для моек по материалу; для остальных — из мапы.
function resolveProductType(sectionConfig, specs) {
  if (sectionConfig.productType) return sectionConfig.productType
  if (sectionConfig.productTypeFromSpec && sectionConfig.materialMap) {
    const raw = String(specs?.[sectionConfig.productTypeFromSpec] || '').toLowerCase()
    for (const [needle, mapped] of Object.entries(sectionConfig.materialMap)) {
      if (raw.includes(needle)) return mapped
    }
  }
  return null
}
function buildCatalogFields(category, productType) {
  const resolved = resolveCatalog(category, productType)
  return {
    category,
    product_type: productType,
    catalog_root_slug: resolved?.root?.slug ?? null,
    catalog_root_name: resolved?.root?.name ?? null,
    catalog_group_slug: resolved?.group?.slug ?? null,
    catalog_group_name: resolved?.group?.name ?? null,
    catalog_leaf_slug: resolved?.leaf?.slug ?? null,
    catalog_leaf_name: resolved?.leaf?.name ?? null
  }
}
// Нормализуем source URL картинки: absolute, без /resize_cache/ (берём оригинал если возможно).
function normalizeImageUrl(src) {
  if (!src) return null
  const abs = absUrl(src)
  if (!abs) return null
  // Bitrix: /upload/resize_cache/iblock/XX/<hash>/<file> → /upload/iblock/XX/<file>
  const m = abs.match(/^(.*?\/upload\/)resize_cache\/(iblock\/[0-9a-f]+\/[0-9a-f]+)\/[^/]+\/([^/]+)$/i)
  if (m) return `${m[1]}${m[2]}/${m[3]}`
  return abs
}
async function goto(page, url, wait = ACTION_DELAY) {
  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await sleep(wait)
  return { response, status: response?.status() || 0 }
}

// ─── Stage 1: список товаров с пагинацией ────────────────────────────────────
// Возвращает массив "родителей": { parent_id, active_offer_id, url, name, colorSwatches, listData }
async function scrapeSection(page, sectionPath) {
  const sectionUrl = absUrl(sectionPath)
  const collected = []
  const seenParents = new Set()
  let pageNum = 1
  let lastFound = 0
  const maxPages = 100
  while (pageNum <= maxPages) {
    // Узнаём имя параметра пагинации на первой странице (Bitrix: PAGEN_1..N).
    const pageUrl = new URL(sectionUrl)
    if (pageNum > 1) {
      // По умолчанию PAGEN_1; если на сайте окажется иначе — подстроим ниже.
      pageUrl.searchParams.set('PAGEN_1', String(pageNum))
    }
    const { status } = await goto(page, pageUrl.href)
    if (status === 404) { await logWarn('SECTION_404', sectionPath, 'page', pageNum); break }
    if (status >= 500) { await logError('SECTION_5XX', sectionPath, 'page', pageNum, 'status', status); break }

    const parsed = await page.evaluate(extractCardsFromList)
    // Если первая страница: определим реальный параметр пагинации по ссылке в пагинаторе.
    if (pageNum === 1) {
      const realParam = await page.evaluate(() => {
        const a = document.querySelector('.pagination a[href*="PAGEN_"], .nums a[href*="PAGEN_"], .bx-pagination a[href*="PAGEN_"]')
        const href = a?.getAttribute('href') || ''
        const m = href.match(/PAGEN_(\d+)=/)
        return m ? `PAGEN_${m[1]}` : null
      })
      if (realParam && realParam !== 'PAGEN_1') {
        // Перестроим URL на найденный параметр для следующих страниц.
        pageUrl.searchParams.delete('PAGEN_1')
        pageUrl.searchParams.set(realParam, String(pageNum))
      }
    }
    if (!parsed.cards.length) { await logInfo('SECTION_END', sectionPath, 'page', pageNum, 'reason:no-cards'); break }
    // Фильтр по бренду + dedup по parent_id (Bitrix повторяет товар на нескольких
    // страницах с разным активным цветом — нам нужна каждая карточка только один раз,
    // полный список цветов у неё уже есть в свотчах).
    const kept = []
    let skippedBrand = 0
    let skippedDup = 0
    for (const card of parsed.cards) {
      const brandLower = detectBrand(card.name_full || card.name_short).name.toLowerCase()
      if (!ALLOWED_BRANDS.includes(brandLower)) { skippedBrand++; continue }
      if (seenParents.has(card.parent_id)) { skippedDup++; continue }
      seenParents.add(card.parent_id)
      kept.push(card)
    }
    collected.push(...kept)
    await logInfo('SECTION', sectionPath, `page:${pageNum}`, `cards:${parsed.cards.length}`, `kept:${kept.length}`, `skipped-brand:${skippedBrand}`, `skipped-dup:${skippedDup}`, `total:${collected.length}`)
    if (parsed.cards.length < lastFound) { /* shrinking — близко к концу, но продолжаем */ }
    lastFound = parsed.cards.length
    if (!parsed.hasNext) { await logInfo('SECTION_END', sectionPath, 'page', pageNum, 'reason:no-next'); break }
    pageNum++
  }
  return collected
}
// Эта функция серилизуется в браузер — никаких внешних замыканий, только чистый DOM.
function extractCardsFromList() {
  const cards = []
  // Берём только контейнер карточки (.catalog-block__wrapper). Внутри есть
  // вложенный .catalog-block__item — его отдельно не трогаем, иначе будет дубль.
  const nodes = document.querySelectorAll('.catalog-block__wrapper')
  const seen = new Set()
  for (const node of nodes) {
    try {
      const root = node
      // parent_id из id="bx_<digits>_<digits>" (контейнер карточки).
      const idHost = [...root.querySelectorAll('[id^="bx_"]')]
        .find(el => /^bx_\d+_\d+$/.test(el.getAttribute('id') || ''))
      const idAttr = idHost?.getAttribute('id') || ''
      const parentMatch = idAttr.match(/_(\d+)$/)
      const parentId = parentMatch ? parentMatch[1] : null

      // active offer_id из data-id на info-блоке
      const info = root.querySelector('.catalog-block__info[data-id], .catalog-block__info')
      const activeOfferId = info?.getAttribute('data-id') || null

      // Имя из data-item.NAME (там полное, с цветом)
      let fullName = null
      let shortName = null
      const dataItemRaw = info?.getAttribute('data-item')
      if (dataItemRaw) {
        try { fullName = JSON.parse(dataItemRaw).NAME || null } catch {}
      }
      shortName = root.querySelector('.catalog-block__info-title span')?.textContent?.trim() || fullName

      // URL канонический (без ?oid=)
      const urlLink = root.querySelector('link[itemprop="url"]')?.getAttribute('href')
        || root.querySelector('.catalog-block__info-title a')?.getAttribute('href')
        || root.querySelector('a.image-list__link')?.getAttribute('href')
      const url = urlLink ? urlLink.split('?')[0] : null

      // Цена
      const priceMeta = root.querySelector('meta[itemprop="price"]')?.getAttribute('content')
      const priceText = root.querySelector('.price__new-val')?.textContent?.trim()
      let price = priceMeta ? Number(priceMeta) : null
      if (!price || !Number.isFinite(price)) price = Number((priceText || '').replace(/[^\d]/g, '')) || null

      // Картинки из галереи списка (атрибуты data-big / data-src / src)
      const images = []
      const seenImg = new Set()
      root.querySelectorAll('.section-gallery-wrapper img, .gallery__item--thumb img').forEach(img => {
        const src = img.getAttribute('data-big') || img.getAttribute('data-src') || img.getAttribute('src')
        if (!src || /no[-_]?image|placeholder|\.svg(\?|$)/i.test(src)) return
        if (seenImg.has(src)) return
        seenImg.add(src)
        images.push(src)
      })

      // Цветовые свотчи — {title, onevalue}. onevalue — это ID значения свойства (цвета),
      // НЕ offer ID. Реальный offer ID берём ниже из template.offers-template-json по дереву TREE.
      const colorSwatches = []
      const colorPropHost = root.querySelector('.sku-props__inner[data-id]')
      const colorPropId = colorPropHost?.getAttribute('data-id') || null
      root.querySelectorAll('.sku-props__value[data-onevalue]').forEach(btn => {
        const title = btn.getAttribute('data-title') || btn.textContent?.trim()
        const onevalue = btn.getAttribute('data-onevalue')
        if (title && onevalue) colorSwatches.push({ title: title.trim(), onevalue })
      })

      // Шаблон офферов: [{ID, TREE:{PROP_NNNN:value}}]. Сматчиваем value → ID оффера.
      const tplRaw = root.querySelector('template.offers-template-json')?.textContent?.trim()
      let tplOffers = null
      if (tplRaw) { try { tplOffers = JSON.parse(tplRaw) } catch {} }

      // Характеристики из списка (короткие)
      const specs = {}
      root.querySelectorAll('.properties__item').forEach(item => {
        const k = item.querySelector('.properties__title')?.textContent?.trim()
        const v = item.querySelector('.properties__value')?.textContent?.trim()
        if (k && v) specs[k] = v
      })

      if (!url || !parentId) continue
      cards.push({
        parent_id: parentId,
        active_offer_id: activeOfferId,
        color_prop_id: colorPropId,
        name_full: fullName,
        name_short: shortName,
        url,
        price,
        images,
        colorSwatches,
        tpl_offers: tplOffers,
        list_specs: specs
      })
    } catch (e) { /* пропускаем битую карточку */ }
  }
  // Есть ли следующая страница в пагинаторе
  const hasNext = Boolean(
    document.querySelector('.pagination a.next, .pagination .next:not(.disabled), .nums a[href*="PAGEN_"]:not([class*="active"])')
  ) || Boolean(document.querySelector(`a[href*="PAGEN_"]`))
  return { cards, hasNext }
}

// ─── Stage 2: детальная страница ─────────────────────────────────────────────
// С одного захода берём полное описание, полную галерею, полные характеристики.
async function scrapeDetail(page, card) {
  const url = absUrl(card.url)
  const { status } = await goto(page, url)
  if (status === 404) return { ...card, detail: { description: null, images: [], specs: {}, status: 'not-found' } }
  const detail = await page.evaluate(extractDetailFromPage)
  return { ...card, detail }
}
function extractDetailFromPage() {
  // Полное описание. На grandex-aqua 3 элемента с [itemprop=description]:
  //   1) <meta> — короткий, 2) .catalog-detail__previewtext — превью, 3) .js-detail-description — полный.
  // Целимся сразу в полный.
  let description = ''
  const descSelectors = [
    '.js-detail-description',
    'div[itemprop="description"]:not(.catalog-detail__previewtext)',
    '.product-detail-description',
    '.blocks__item .text', '.detail .text',
    '#desc', '.properties_block .text',
    '.detail_text', '.element_detail_text'
  ]
  for (const sel of descSelectors) {
    const node = document.querySelector(sel)
    if (node) {
      // Клонируем, убираем <style>/<script>, берём textContent — без HTML вообще
      const clone = node.cloneNode(true)
      clone.querySelectorAll('style, script').forEach(el => el.remove())
      let text = clone.textContent || ''
      text = text
        .replace(/\r/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/[ \t]+/g, ' ')               // пробелы/табы → один
        .replace(/ *\n */g, '\n')              // пробелы вокруг переносов
        .replace(/\n{2,}/g, '\n')              // множественные переносы → один
        .replace(/\n{2,}/g, '\n')              // повтор (на случай остатков)
        .replace(/^\n+|\n+$/g, '')             // переносы в начале/конце
        .trim()
      if (text && text.length > 60) { description = text; break }
    }
  }
  if (!description) {
    description = document.querySelector('meta[itemprop="description"]')?.getAttribute('content')?.trim() || ''
  }
  // Полная галерея (реальные классы Aspro Premier на grandex-aqua).
  const images = []
  const seen = new Set()
  const pushImg = src => {
    if (!src || /no[-_]?image|placeholder|\.svg(\?|$)/i.test(src)) return
    const big = src
    if (seen.has(big)) return
    seen.add(big)
    images.push(big)
  }
  // Превью галереи (.gallery__item--thumb img[src])
  document.querySelectorAll('.gallery__item--thumb img').forEach(img => pushImg(img.getAttribute('src') || img.getAttribute('data-src')))
  // Большая картинка (.detail-gallery-big__link img или a[href])
  document.querySelectorAll('.detail-gallery-big__link').forEach(a => {
    pushImg(a.getAttribute('href'))
    pushImg(a.querySelector('img')?.getAttribute('src'))
  })
  // Fallback — любая картинка с /upload/iblock/ (товарные изображения Bitrix)
  if (!images.length) {
    document.querySelectorAll('img[src*="/upload/iblock/"]').forEach(img => pushImg(img.getAttribute('src')))
  }
  // Полные характеристики.
  // Реальный блок на grandex-aqua: .properties-group__item (внутри #char таба),
  // внутри него .properties-group__name и .properties-group__value.
  const specs = {}
  document.querySelectorAll(
    '.properties-group__item, .properties__item, .props_list li, .product-detail-properties tr'
  ).forEach(item => {
    const k = item.querySelector(
      '.properties-group__name, .properties__title, .props_list__title, td:first-child'
    )?.textContent?.trim()
    const v = item.querySelector(
      '.properties-group__value, .properties__value, .props_list__value, td:last-child'
    )?.textContent?.trim()
    if (k && v && !specs[k]) specs[k] = v
  })
  return { description, images, specs, status: 'ok' }
}

// ─── Stage 3: раздувание в пул (по одному товару на цвет) ────────────────────
function expandToProducts(scraped, sectionConfig) {
  const base = scraped
  const detail = base.detail || {}
  const mergedSpecs = { ...base.list_specs, ...detail.specs }
  // Все цвета: приоритет — свотчам (с матчингом onevalue → offer ID через шаблон);
  // fallback — активный цвет; если совсем ничего нет — один товар без цвета.
  let colorsPool = []
  if (base.colorSwatches.length) {
    for (const sw of base.colorSwatches) {
      colorsPool.push({ title: sw.title, onevalue: sw.onevalue })
    }
  } else {
    colorsPool = [{ title: null, onevalue: null }]
  }
  const productType = resolveProductType(sectionConfig, mergedSpecs)
  const catalogFields = buildCatalogFields(sectionConfig.category, productType)
  // Склеиваем картинки: detail (оригиналы) → list (fallback).
  const allImages = []
  for (const src of [...detail.images, ...base.images]) {
    const norm = normalizeImageUrl(src)
    if (norm && !allImages.includes(norm)) allImages.push(norm)
  }
  const description = detail.description || null
  const activeArticle = mergedSpecs['Артикул'] || null
  const out = []
  for (const color of colorsPool) {
    // Реальный offer ID недоступен в статическом HTML сайта (подгружается через AJAX).
    // Поэтому external_id = parent_id + onevalue — уникально и стабильно per цвет.
    const onevalue = color.onevalue || color.offerId
    const externalId = onevalue
      ? `${base.parent_id}:${onevalue}`
      : `parent:${base.parent_id}`
    const specs = { ...mergedSpecs }
    if (activeArticle) specs['Артикул'] = activeArticle
    if (color.title) specs['Цвет'] = color.title
    // Имя: вычистить активный цвет из базового имени, потом добавить текущий цвет.
    // На сайте fullName содержит активный цвет, например:
    //   "Мойка Grandex Aqua OPTIMA 44 ANTHRACITE, 440х440х200, (5011353)"
    // Без очистки при GOLD получится "...ANTHRACITE, ... GOLD" — два цвета.
    const allColorTitles = base.colorSwatches.map(s => String(s.title).trim()).filter(Boolean)
    let name = base.name_full || base.name_short
    if (name && allColorTitles.length) {
      for (const ct of allColorTitles) {
        // Экранируем спецсимволы для regex
        const escaped = ct.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        name = name.split(new RegExp('\\b' + escaped + '\\b', 'i')).join('')
      }
      name = name.replace(/\s{2,}/g, ' ').replace(/ ,/g, ',').replace(/,\s*,/g, ',').replace(/,\s*$/, '').trim()
    }
    if (color.title && name && !name.toLowerCase().includes(String(color.title).toLowerCase())) {
      name = `${name} ${color.title}`
    }
    out.push({
      external_id: externalId,
      source: SOURCE,
      brand: detectBrand(base.name_full || base.name_short),
      name,
      description,
      ...catalogFields,
      price_rrc: base.price ?? null,
      price_opt: null,
      price_ric: null,
      specs,
      raw: {
        parent_id: base.parent_id,
        active_offer_id: base.active_offer_id,
        color_prop_id: base.color_prop_id,
        color_onevalue: color.onevalue,
        color: color.title,
        source_url: absUrl(base.url),
        imported_from: SOURCE
      },
      images: allImages
    })
  }
  return out
}

// ─── Оркестрация ─────────────────────────────────────────────────────────────
async function worker(browser, queue, stats) {
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 1000 })
  while (queue.length) {
    const card = queue.shift()
    stats.done++
    const pct = stats.total ? Math.round((stats.done / stats.total) * 100) : 100
    const label = `[${stats.done}/${stats.total} ${pct}%] parent:${card.parent_id} ${card.name_short || card.url}`
    try {
      const detailed = await scrapeDetail(page, card)
      const products = expandToProducts(detailed, card._sectionConfig)
      stats.products.push(...products)
      const colorList = detailed.colorSwatches.map(c => c.title).filter(Boolean).join('/') || '-'
      await logSuccess('OK', label, `colors:${products.length}`, `[${colorList}]`, `imgs:${detailed.detail?.images?.length || 0}`, `desc:${detailed.detail?.description ? 'yes' : 'no'}`)
    } catch (e) {
      await logError('ERROR', label, e.message)
      stats.failed.push({ parent_id: card.parent_id, url: card.url, reason: e.message })
    }
    await sleep(PRODUCT_DELAY)
  }
  await page.close()
}

async function main() {
  let browser
  try {
    await fs.ensureDir(ROOT)
    await fs.writeFile(LOG, '')
    // Чистим выходные файлы перед запуском.
    await fs.writeFile(PRODUCTS_FILE, '')
    await fs.writeFile(QUEUE_FILE, '[]')

    const sections = Object.entries(categoriesMap).filter(([p]) => !ONLY_SECTION || p === ONLY_SECTION)
    if (!sections.length) throw new Error(`No sections to process. Check FETCH_GRANDEX_SECTION=${ONLY_SECTION}`)
    await logInfo('START', `base:${BASE}`, `sections:${sections.length}`, `threads:${THREADS}`, `headless:${HEADLESS}`)

    browser = await puppeteer.launch({ headless: HEADLESS, defaultViewport: null, args: ['--no-sandbox', '--disable-setuid-sandbox'] })
    const page = await browser.newPage()
    await page.setViewport({ width: 1440, height: 1000 })

    // Stage 1: собираем карточки со всех разделов.
    const allCards = []
    for (const [sectionPath, sectionConfig] of sections) {
      await logInfo('SECTION_START', sectionPath, `category:${sectionConfig.category}`)
      const cards = await scrapeSection(page, sectionPath)
      for (const card of cards) card._sectionConfig = sectionConfig
      allCards.push(...cards)
      await logInfo('SECTION_DONE', sectionPath, `cards:${cards.length}`, `running-total:${allCards.length}`)
    }
    await page.close()
    await logInfo('CARDS_TOTAL', allCards.length)

    // Stage 2 + 3: детальные страницы и расширение в продукты — параллельно.
    const stats = { total: allCards.length, done: 0, products: [], failed: [] }
    const queue = [...allCards]
    const workers = []
    for (let i = 0; i < THREADS; i++) workers.push(worker(browser, queue, stats))
    await Promise.all(workers)

    await browser.close()
    browser = null

    // Stage 4: запись результатов.
    for (const product of stats.products) {
      await fs.appendFile(PRODUCTS_FILE, JSON.stringify(product) + '\n')
    }
    const imageQueue = stats.products
      .filter(p => p.images?.length)
      .map(p => ({ external_id: p.external_id, name: p.name, source: SOURCE, image_urls: p.images }))
    await fs.writeJson(QUEUE_FILE, imageQueue, { spaces: 2 })

    await logSuccess('DONE', `products:${stats.products.length}`, `image-queue:${imageQueue.length}`, `failed:${stats.failed.length}`)
    if (stats.failed.length) {
      await fs.writeJson(path.resolve(`${ROOT}/fetch-failed.json`), stats.failed, { spaces: 2 })
      await logWarn('FAILED_SAVED', `${ROOT}/fetch-failed.json`)
    }
    // Краткая сводка по категориям для eyeballing.
    const byCat = {}
    for (const p of stats.products) byCat[p.category || '-'] = (byCat[p.category || '-'] || 0) + 1
    await logInfo('BY_CATEGORY', JSON.stringify(byCat))
  } catch (e) {
    await logError('FATAL', e.stack || e.message)
    if (browser) await browser.close().catch(() => null)
    process.exitCode = 1
  }
}
main()
