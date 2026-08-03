import postgres from 'postgres'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import fs from 'fs'
import dotenv from 'dotenv'

dotenv.config()

const sql = postgres({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD
})

const s3 = new S3Client({
  region: 'reg',
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY
  },
  forcePathStyle: true
})

const BUCKET = process.env.S3_BUCKET
const PUBLIC_PREFIX = `${process.env.S3_ENDPOINT.replace(/\/$/, '')}/${process.env.S3_BUCKET}/`

async function upload(filePath, key) {
  const buffer = fs.readFileSync(filePath)
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ACL: 'public-read',
    ContentType: 'image/webp',
    CacheControl: 'public, max-age=31536000, immutable'
  }))
  return `${PUBLIC_PREFIX}${key}`
}

async function main() {
  // Создаём таблицу если нет
  await sql`
    create table if not exists slides (
      id serial primary key,
      desktop_url text not null,
      mobile_url text not null,
      position int not null default 0,
      is_active boolean not null default true,
      created_at timestamptz not null default now()
    )
  `
  console.log('Таблица slides готова')

  // Проверяем есть ли уже слайды
  const existing = await sql`SELECT count(*) as cnt FROM slides`
  if (existing[0].cnt > 0) {
    console.log(`В таблице уже ${existing[0].cnt} слайдов, пропускаю`)
    await sql.end()
    return
  }

  const files = ['1', '2', '3', '4']
  for (let i = 0; i < files.length; i++) {
    const num = files[i]
    const desktopPath = `src/lib/assets/main_slider/desktop/${num}.webp`
    const mobilePath = `src/lib/assets/main_slider/mobile/${num}.webp`

    const desktopKey = `slides/desktop-${num}.webp`
    const mobileKey = `slides/mobile-${num}.webp`

    console.log(`Загружаю слайд ${num}...`)
    const desktopUrl = await upload(desktopPath, desktopKey)
    const mobileUrl = await upload(mobilePath, mobileKey)

    await sql`
      INSERT INTO slides (desktop_url, mobile_url, position)
      VALUES (${desktopUrl}, ${mobileUrl}, ${i})
    `
    console.log(`  ✅ Слайд ${num} загружен`)
  }

  console.log('Готово! 4 слайда мигрированы.')
  await sql.end()
}

main().catch(e => { console.error(e); process.exit(1) })
