// Импорт товаров rusklimat из products-data.jsonl в PostgreSQL.
// Upsert: ON CONFLICT (external_id) — безопасен при повторных запусках.
// Картинки НЕ трогаем — отдельный скрипт (fetch-images.js, Phase 3).
//
// Запуск (5 тестовых):
//   node scripts/fetch-rusklimat/import.js --limit 5
// Запуск (все):
//   node scripts/fetch-rusklimat/import.js

import 'dotenv/config'
import postgres from 'postgres'
import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const ROOT = path.dirname(__filename)
const SOURCE = 'rusklimat'
const JSONL_FILE = path.resolve(`${ROOT}/products-data.jsonl`)
const LOG = path.resolve(`${ROOT}/import.log`)

// --limit N из CLI аргументов
const limitArg = process.argv.find(a => a.startsWith('--limit'))
const LIMIT = limitArg ? Number(limitArg.split('=')[1] || process.argv[process.argv.indexOf(limitArg) + 1]) : 0

// Логирование
const sleep = ms => new Promise(r => setTimeout(r, ms))
async function log(...a) {
  const line = `[${new Date().toISOString()}] ${a.join(' ')}`
  console.log(line)
  await fs.appendFile(LOG, line + '\n')
}

async function main() {
  const sql = postgres({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  })

  try {
    await fs.ensureDir(ROOT)
    await fs.writeFile(LOG, '')

    // Читаем JSONL
    const raw = await fs.readFile(JSONL_FILE, 'utf8')
    const lines = raw.split('\n').filter(Boolean)
    const items = lines.map(l => JSON.parse(l))
    const subset = LIMIT > 0 ? items.slice(0, LIMIT) : items

    if (!subset.length) {
      await log('NOTHING', 'no items to import')
      await sql.end()
      return
    }

    await log('START', `source:${SOURCE}`, `total:${items.length}`, `importing:${subset.length}`)

    // Предпросмотр первых товаров
    for (const p of subset.slice(0, 5)) {
      await log('PREVIEW', p.external_id, '|', p.name?.substring(0, 80), '|', p.category, '|', p.product_type)
    }
    if (subset.length > 5) await log('...', `and ${subset.length - 5} more`)

    // Upsert по одному (простой и надёжный для теста)
    let imported = 0
    let updated = 0
    let failed = 0

    for (const p of subset) {
      try {
        const brand = typeof p.brand === 'object' ? p.brand : { name: p.brand, api: SOURCE }
        const specs = p.specs || {}

        // Характеристики в формате Tetrasis для UI карточки товара:
        // raw.ДопРеквизиты = { "Цвет": "ANTHRACITE", "Материал": "...", ... }
        // raw.ДопРеквизитыНаименование = { "Цвет": "Цвет", "Материал": "Материал", ... }
        const ДопРеквизиты = {}
        const ДопРеквизитыНаименование = {}
        for (const [k, v] of Object.entries(specs)) {
          if (v == null || v === '') continue
          ДопРеквизиты[k] = v
          ДопРеквизитыНаименование[k] = k
        }

        const raw = {
          nsCode: p.raw?.nsCode,
          vendorCode: p.raw?.vendorCode,
          categoryId: p.raw?.categoryId,
          barcode: p.raw?.barcode,
          remains: p.raw?.remains,
          exclusive: p.raw?.exclusive,
          source_url: p.raw?.source_url,
          imported_from: SOURCE,
          imported_at: new Date().toISOString(),
          ДопРеквизиты,
          ДопРеквизитыНаименование
        }

        // Цены в JSONL — рубли (37300), в БД храним в тыс. (37.3)
        const price_rrc = p.price_rrc != null ? p.price_rrc / 1000 : null
        const price_opt = p.price_opt != null ? p.price_opt / 1000 : null
        const price_ric = p.price_ric != null ? p.price_ric / 1000 : null

        const result = await sql`
          insert into products (
            external_id, source, brand, name, description,
            category, product_type,
            catalog_root_slug, catalog_root_name,
            catalog_group_slug, catalog_group_name,
            catalog_leaf_slug, catalog_leaf_name,
            price_rrc, price_opt, price_ric,
            specs, raw
          ) values (
            ${p.external_id}, ${SOURCE}, ${sql.json(brand)}, ${p.name}, ${p.description},
            ${p.category}, ${p.product_type},
            ${p.catalog_root_slug}, ${p.catalog_root_name},
            ${p.catalog_group_slug}, ${p.catalog_group_name},
            ${p.catalog_leaf_slug}, ${p.catalog_leaf_name},
            ${price_rrc}, ${price_opt}, ${price_ric},
            ${sql.json(specs)}, ${sql.json(raw)}
          )
          on conflict (external_id) do update set
            source = excluded.source,
            brand = excluded.brand,
            name = excluded.name,
            description = excluded.description,
            category = excluded.category,
            product_type = excluded.product_type,
            catalog_root_slug = excluded.catalog_root_slug,
            catalog_root_name = excluded.catalog_root_name,
            catalog_group_slug = excluded.catalog_group_slug,
            catalog_group_name = excluded.catalog_group_name,
            catalog_leaf_slug = excluded.catalog_leaf_slug,
            catalog_leaf_name = excluded.catalog_leaf_name,
            price_rrc = excluded.price_rrc,
            price_opt = excluded.price_opt,
            price_ric = excluded.price_ric,
            specs = excluded.specs,
            raw = excluded.raw,
            updated_at = now()
          returning id, (xmax = 0) as is_new
        `

        if (result[0].is_new) imported++
        else updated++
        await log('OK', `${imported + updated}/${subset.length}`, p.external_id, p.name?.substring(0, 60))
      } catch (e) {
        failed++
        await log('FAIL', p.external_id, e.message)
      }
    }

    await log('DONE', `imported:${imported}`, `updated:${updated}`, `failed:${failed}`)

  } catch (e) {
    await log('FATAL', e.stack || e.message)
    process.exitCode = 1
  } finally {
    await sql.end()
  }
}

main()
