// Тест загрузки слайда локально: node scripts/test-slide-upload.mjs <desktop.jpg> <mobile.jpg>
import { readFileSync } from 'fs'
import sharp from 'sharp'

const [desktopPath, mobilePath] = process.argv.slice(2)
if (!desktopPath || !mobilePath) {
  console.log('Использование: node scripts/test-slide-upload.mjs <desktop.jpg> <mobile.jpg>')
  process.exit(1)
}

for (const [label, path] of [['Desktop', desktopPath], ['Mobile', mobilePath]]) {
  try {
    const buf = readFileSync(path)
    console.log(`${label}: файл ${buf.length} bytes`)
    const meta = await sharp(buf).metadata()
    console.log(`  формат: ${meta.format}, размер: ${meta.width}x${meta.height}, ratio: ${(meta.width/meta.height).toFixed(2)}`)
    // Пробуем конвертацию как на сервере
    const webp = await sharp(buf).resize({ width: label === 'Desktop' ? 1920 : 800, withoutEnlargement: true }).webp({ quality: 85 }).toBuffer()
    console.log(`  ✅ webp конвертация ок: ${webp.length} bytes`)
  } catch (e) {
    console.log(`  ❌ ОШИБКА: ${e.message}`)
  }
}
