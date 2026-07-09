// Получение данных кондиционеров с Русклимата через REST API.
// БЕЗ Puppeteer — чистый HTTP.
//
// Этапы:
//   1. Авторизация → JWT
//   2. Получение requestKey
//   3. Получение дерева категорий → находим UUID нужных
//   4. Получение свойств (id→имя)
//   5. Загрузка товаров по категориям (пагинация)
//   6. Запись products-data.jsonl + image-queue.json
//   7. Автодобавление брендов в brands.json
//
// Запуск:
//   node scripts/fetch-rusklimat/fetch.js
// Тест (--limit N):
//   node scripts/fetch-rusklimat/fetch.js --limit 5

import 'dotenv/config'
import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const ROOT = path.dirname(__filename)
const PROJECT_ROOT = path.resolve(ROOT, '../..')

const JSONL_FILE = path.resolve(`${ROOT}/products-data.jsonl`)
const QUEUE_FILE = path.resolve(`${ROOT}/image-queue.json`)
const CATEGORIES_FILE = path.resolve(`${ROOT}/categories.json`)
const LOG = path.resolve(`${ROOT}/fetch.log`)
const BRANDS_JSON = path.resolve(`${PROJECT_ROOT}/scripts/sync-tetrasis-products/brands.json`)

// --limit N
const limitArg = process.argv.find(a => a.startsWith('--limit'))
const LIMIT = limitArg ? Number(limitArg.split('=')[1] || process.argv[process.argv.indexOf(limitArg) + 1]) : 0

const API_BASE = process.env.RUSKLIMAT_API_BASE
const AUTH_BASE = process.env.RUSKLIMAT_AUTH_BASE
const PARTNER_ID = process.env.RUSKLIMAT_PARTNER_ID
const B2B_LOGIN = process.env.RUSKLIMAT_B2B_LOGIN
const B2B_PASSWORD = process.env.RUSKLIMAT_B2B_PASSWORD

// Категории для маппинга categoryId → productType
// exactName — точное имя категории из API (регистронезависимое сравнение)
const CATEGORY_MAP = [
  { exactName: 'Сплит-системы настенного типа', productType: 'Сплит-система on/off' },
  { exactName: 'Инверторные сплит-системы настенного типа', productType: 'Инверторная сплит-система' },
  { exactName: 'Мобильные кондиционеры', productType: 'Кондиционер мобильный' },
]

// Маппинг productType → catalog slugs (дублирует resolveCatalog из categories.ts,
// чтобы не тащить TypeScript-зависимость в node-скрипт).
const CATALOG_BY_TYPE = {
  'Сплит-система on/off': {
    root: { slug: 'klimaticheskaya-tehnika', name: 'Климатическая техника' },
    group: { slug: 'kondicionery', name: 'Кондиционеры' },
    leaf: { slug: 'split-sistemy-on-off', name: 'Сплит-системы on/off' }
  },
  'Инверторная сплит-система': {
    root: { slug: 'klimaticheskaya-tehnika', name: 'Климатическая техника' },
    group: { slug: 'kondicionery', name: 'Кондиционеры' },
    leaf: { slug: 'invertornye-split-sistemy', name: 'Инверторные сплит-системы' }
  },
  'Кондиционер мобильный': {
    root: { slug: 'klimaticheskaya-tehnika', name: 'Климатическая техника' },
    group: { slug: 'kondicionery', name: 'Кондиционеры' },
    leaf: { slug: 'mobilnye-kondicionery', name: 'Мобильные кондиционеры' }
  }
}

// Логирование
async function log(...a) {
  const line = `[${new Date().toISOString()}] ${a.join(' ')}`
  console.log(line)
  await fs.appendFile(LOG, line + '\n')
}

// ─── API клиент ───

let jwt = null

async function apiFetch(url, options = {}) {
  const headers = { ...options.headers }
  if (jwt) headers['Authorization'] = jwt
  const res = await fetch(url, { ...options, headers })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status} ${url}: ${text.substring(0, 200)}`)
  }
  return res
}

async function authenticate() {
  await log('AUTH', 'Получение JWT токена...')
  const res = await fetch(`${AUTH_BASE}/api/v1/auth/jwt/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'catalog-ip' },
    body: JSON.stringify({ login: B2B_LOGIN, password: B2B_PASSWORD })
  })
  const data = await res.json()
  if (data.code !== 200 || !data.data?.jwtToken) {
    throw new Error(`Auth failed: ${JSON.stringify(data)}`)
  }
  jwt = data.data.jwtToken
  // Проверяем срок жизни токена
  const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64').toString())
  const exp = new Date(payload.exp * 1000)
  await log('AUTH', `Токен получен, действует до ${exp.toISOString()}`)
}

async function getRequestKey() {
  const res = await apiFetch(`${API_BASE}/api/v1/InternetPartner/${PARTNER_ID}/requestKey/`)
  const data = await res.json()
  await log('REQUEST_KEY', `requestKey=${data.requestKey}`, `expire=${data.expire}`)
  return data.requestKey
}

async function getCategories(requestKey) {
  const res = await apiFetch(`${API_BASE}/api/v1/InternetPartner/categories/${requestKey}`)
  const data = await res.json()
  await log('CATEGORIES', `Всего категорий: ${data.totalCount}`)

  // Сохраняем полный список для отладки
  await fs.writeJson(CATEGORIES_FILE, data.data, { spaces: 2 })

  // Строим маппинг categoryId → productType
  const catMap = {} // categoryId → productType
  const catIds = [] // categoryId для фильтрации товаров

  for (const entry of CATEGORY_MAP) {
    const found = data.data.find(c =>
      c.name.trim().toLowerCase() === entry.exactName.toLowerCase()
    )
    if (found) {
      catMap[found.id] = entry.productType
      catIds.push(found.id)
      await log('CATEGORY_MATCH', `"${found.name}" → ${found.id} → productType:"${entry.productType}"`)
    } else {
      await log('WARN', `Категория не найдена (точное совпадение): "${entry.exactName}"`)
    }
  }

  return { catMap, catIds }
}

async function getProperties(requestKey) {
  const res = await apiFetch(`${API_BASE}/api/v1/InternetPartner/properties/${requestKey}`)
  const data = await res.json()
  await log('PROPERTIES', `Всего свойств: ${data.totalCount}`)
  // id → name
  const propMap = {}
  for (const p of data.data) {
    propMap[p.id] = p.name
  }
  return propMap
}

async function getProducts(requestKey, categoryIds) {
  const allProducts = []
  let page = 1
  const pageSize = 1000

  while (true) {
    await log('FETCH_PAGE', `page=${page}`, `categories=${categoryIds.length}`)
    const res = await apiFetch(
      `${API_BASE}/api/v1/InternetPartner/${PARTNER_ID}/products/${requestKey}/?pageSize=${pageSize}&page=${page}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filter: { categoryIds }
        })
      }
    )
    const data = await res.json()
    allProducts.push(...data.data)
    await log('PAGE', `page=${page}`, `got=${data.data.length}`, `total=${data.totalCount}`)

    if (data.data.length < pageSize) break
    page++
  }

  return allProducts
}

// ─── Обработка данных ───

function stripHtml(html) {
  if (!html) return ''
  // Убираем HTML теги
  const text = html.replace(/<[^>]+>/g, ' ')
  // Нормализация пробелов и newlines
  return text.replace(/&nbsp;/gi, ' ')
    .replace(/&[a-z]+;/gi, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .replace(/\n /g, '\n')
    .trim()
}

function buildProductType(categoryId, catMap) {
  return catMap[categoryId] || null
}

async function saveBrands(products) {
  const brands = [...new Set(products.map(p => p.brand).filter(Boolean))].sort()
  await log('BRANDS', `Найдено брендов: ${brands.length}`, brands.join(', '))

  // Читаем текущий brands.json
  let existing = []
  try {
    existing = await fs.readJson(BRANDS_JSON)
  } catch {
    await log('BRANDS', 'brands.json не найден, создаю новый')
  }

  const existingNames = new Set(existing)
  let added = 0
  for (const brand of brands) {
    if (!existingNames.has(brand)) {
      existing.push(brand)
      existingNames.add(brand)
      added++
      await log('BRANDS_ADD', brand)
    }
  }

  if (added > 0) {
    await fs.writeJson(BRANDS_JSON, existing, { spaces: 2, EOL: '\n' })
    await log('BRANDS', `Добавлено ${added} новых брендов в brands.json`)
  } else {
    await log('BRANDS', 'Все бренды уже есть в brands.json')
  }
}

// ─── Main ───

async function main() {
  await fs.ensureDir(ROOT)
  await fs.writeFile(LOG, '')

  try {
    // 1. Авторизация
    await authenticate()

    // 2. RequestKey
    const requestKey = await getRequestKey()

    // 3. Категории
    const { catMap, catIds } = await getCategories(requestKey)
    if (!catIds.length) {
      await log('FATAL', 'Не найдено ни одной категории. Проверьте CATEGORY_MAP и categories.json')
      process.exit(1)
    }

    // 4. Свойства (id → имя)
    const propMap = await getProperties(requestKey)

    // 5. Товары
    const products = await getProducts(requestKey, catIds)
    await log('PRODUCTS', `Всего товаров: ${products.length}`)

    // 6. Обработка → JSONL + image-queue
    const jsonlLines = []
    const imageQueue = []
    let skipped = 0

    for (const p of products) {
      const productType = buildProductType(p.categoryId, catMap)
      if (!productType) {
        await log('SKIP_NO_TYPE', p.id, p.name?.substring(0, 60))
        skipped++
        continue
      }

      // Характеристики: properties — это { uuid: value } или { uuid: {value, unit} }
      const specs = {}
      if (p.properties) {
        for (const [propId, val] of Object.entries(p.properties)) {
          const name = propMap[propId]
          if (!name) continue
          const actualVal = typeof val === 'object' ? val.value : val
          if (actualVal == null || actualVal === '') continue
          specs[name] = String(actualVal)
        }
      }

      // Картинки: v3 даёт [{url, title}], v1/v2 — массив строк
      let images = []
      if (p.pictures) {
        images = p.pictures.map(pic => typeof pic === 'string' ? pic : pic?.url).filter(Boolean)
      }

      // Описание: strip HTML
      const description = stripHtml(p.description)

      // Бренд
      const brand = p.brand ? { name: p.brand, api: 'rusklimat' } : null

      // Каталог: статический маппинг (дубликат resolveCatalog из categories.ts)
      const cat = CATALOG_BY_TYPE[productType]

      const record = {
        external_id: p.id,
        source: 'rusklimat',
        brand,
        name: p.name,
        description,
        category: 'Климатическая техника',
        product_type: productType,
        catalog_root_slug: cat?.root?.slug ?? null,
        catalog_root_name: cat?.root?.name ?? null,
        catalog_group_slug: cat?.group?.slug ?? null,
        catalog_group_name: cat?.group?.name ?? null,
        catalog_leaf_slug: cat?.leaf?.slug ?? null,
        catalog_leaf_name: cat?.leaf?.name ?? null,
        price_rrc: p.price || null,
        price_opt: p.internetPrice || null,
        price_ric: p.clientPrice && p.clientPrice > 0 ? p.clientPrice : null,
        specs,
        images,
        raw: {
          nsCode: p.nsCode || null,
          vendorCode: p.vendorCode || null,
          categoryId: p.categoryId,
          barcode: p.barcode || [],
          remains: p.remains || null,
          exclusive: p.exclusive || false,
          imported_from: 'rusklimat',
          imported_at: new Date().toISOString()
        }
      }

      jsonlLines.push(JSON.stringify(record))

      if (images.length) {
        imageQueue.push({
          external_id: p.id,
          name: p.name,
          source: 'rusklimat',
          image_urls: images
        })
      }
    }

    // Применяем limit
    const finalLines = LIMIT > 0 ? jsonlLines.slice(0, LIMIT) : jsonlLines
    const finalQueue = LIMIT > 0 ? imageQueue.slice(0, LIMIT) : imageQueue

    await fs.writeFile(JSONL_FILE, finalLines.join('\n') + '\n')
    await fs.writeJson(QUEUE_FILE, finalQueue, { spaces: 2, EOL: '\n' })

    await log('SAVE', `products-data.jsonl: ${finalLines.length} товаров`)
    await log('SAVE', `image-queue.json: ${finalQueue.length} товаров с картинками`)
    if (skipped) await log('SKIP', `skipped=${skipped} (без productType)`)

    // 7. Бренды
    const subset = LIMIT > 0 ? products.slice(0, LIMIT) : products
    await saveBrands(subset)

    await log('DONE', `Всего: ${finalLines.length} товаров, ${finalQueue.length} с картинками, skipped=${skipped}`)

  } catch (e) {
    await log('FATAL', e.stack || e.message)
    process.exitCode = 1
  }
}

main()
