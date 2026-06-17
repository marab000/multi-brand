// Полный цикл grandex-aqua: парсинг сайта → БД → картинки
// Запуск: caffeinate -dims node scripts/fetch-grandex-aqua/sync.js
// Тест (--limit N): caffeinate -dims node scripts/fetch-grandex-aqua/sync.js --limit 5

import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const DIR = path.dirname(__filename)

const LIMIT_ARG = process.argv.find(a => a.startsWith('--limit'))
const LIMIT = LIMIT_ARG ? Number(LIMIT_ARG.split('=')[1] || process.argv[process.argv.indexOf(LIMIT_ARG) + 1]) : 0
const limitFlag = LIMIT > 0 ? `--limit ${LIMIT}` : ''

function run(label, script) {
  const cmd = `node ${path.join(DIR, script)} ${limitFlag}`
  console.log(`\n${'═'.repeat(60)}`)
  console.log(`  ▶ ${label}`)
  console.log(`  ${cmd}`)
  console.log(`${'═'.repeat(60)}\n`)
  const start = Date.now()
  try {
    execSync(cmd, { stdio: 'inherit' })
  } catch (e) {
    console.error(`\n  ✖ ${label} FAILED (exit code ${e.status})`)
    console.error(`  Если нужно продолжить со следующей фазы — запусти скрипт отдельно.`)
    process.exit(e.status || 1)
  }
  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  console.log(`\n  ✓ ${label} завершена за ${elapsed}s\n`)
}

console.log(`\n  Grandex Aqua sync | limit=${LIMIT || 'все'}\n`)

// Фаза 1: Парсинг сайта (Puppeteer)
run('Фаза 1: Парсинг сайта (fetch.js)', 'fetch.js')

// Фаза 2: Импорт товаров в БД
run('Фаза 2: Импорт в PostgreSQL (import.js)', 'import.js')

// Фаза 3: Картинки → S3
run('Фаза 3: Картинки → S3 (fetch-images.js)', 'fetch-images.js')

console.log(`\n  ${'═'.repeat(60)}`)
console.log(`  ✓ Все фазы завершены!`)
console.log(`${'═'.repeat(60)}\n`)
