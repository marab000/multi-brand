import 'dotenv/config'
import fetch from 'node-fetch'
import { createClient } from '@supabase/supabase-js'

/* ================= ENV ================= */

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const API_KEY = process.env.TETRAIS_API_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

/* ================= CONFIG ================= */

const TARGET_BRAND_NAMES = [
  'AEG','ASKO','BEKO','Bone Crusher','BOSCH','Brandt','CANDY',
  'De Dietrich',"De'Longhi",'Dunavox','Electrolux','ELICA','Elikor',
  'Evelux','FABER','FALMEC','Franke','GORENJE','GranFest','GRAUDE',
  'Grundig','Haier','Hebermann','HIBERG','Hitachi','Hotpoint',
  'INDESIT',"Jacky's",'KORTING','KRONA','Kuppersberg','KUPPERSBUSCH',
  'LEX','LIEBHERR','Maunfeld','Meyvel','Midea','MIELE','MILLEN',
  'Monsher','NEFF','Omoikiri','Rivelato','Schaub Lorenz','Schulthess',
  'SEAMAN','SIEMENS','SMEG','Teka'
]

const BRAND_CONCURRENCY = 3
const UPSERT_BATCH_SIZE = 100

/* ================= HELPERS ================= */

const normalize = s =>
  s.toLowerCase().replace(/['"]/g, '').trim()

const isTargetBrand = apiName =>
  TARGET_BRAND_NAMES.some(b =>
    normalize(apiName).startsWith(normalize(b))
  )

const toNumber = v => {
  if (!v) return null
  const n = parseFloat(
    String(v).replace(/\s/g,'').replace(',', '.')
  )
  return isNaN(n) ? null : n
}

/* ================= API ================= */

async function fetchBrands() {
  return fetch(
    `https://tetrasis-bt.ru/exch_api.php?CODE=${API_KEY}`
  ).then(r => r.json())
}

/* ================= SYNC ================= */

async function syncBrand(brand) {
  console.log(`🔄 ${brand.NAME}`)

  const [products, prices] = await Promise.all([
    fetch(`https://tetrasis-bt.ru/download/${API_KEY}/${brand.ID}/0/`).then(r => r.json()),
    fetch(`https://tetrasis-bt.ru/download/${API_KEY}/${brand.ID}/2/`).then(r => r.json())
  ])

  const rrcMap = new Map(
    prices
      .filter(p => p['ВидЦены'] === 'РРЦ')
      .map(p => [String(p['НоменклатураID']), toNumber(p['Цена'])])
  )

  const rows = []

  for (const item of products) {
    const price = rrcMap.get(String(item.ID))
    if (!price) continue

    rows.push({
      external_id: item.ID,
      brand_id: brand.ID,
      name: item['РабочееНаименование'],
      sku: item['Артикул'],
      price,
      raw: item
    })
  }

  // bulk upsert
  for (let i = 0; i < rows.length; i += UPSERT_BATCH_SIZE) {
    const batch = rows.slice(i, i + UPSERT_BATCH_SIZE)
    const { error } = await supabase
      .from('products')
      .upsert(batch, { onConflict: 'external_id' })

    if (error) {
      console.error('UPSERT ERROR', error.message)
    }
  }
}

/* ================= MAIN ================= */

async function main() {
  const allBrands = await fetchBrands()
  const brands = allBrands.filter(b => isTargetBrand(b.NAME))

  console.log('Бренды:', brands.map(b => b.NAME))

  for (let i = 0; i < brands.length; i += BRAND_CONCURRENCY) {
    const slice = brands.slice(i, i + BRAND_CONCURRENCY)
    await Promise.all(slice.map(syncBrand))
  }

  console.log('✅ DONE')
}

main()
