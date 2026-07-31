#!/bin/bash
# Скрипт сжатия видео для сайта
# Использование: ./scripts/compress-videos.sh <input.mp4> <output-name>
# Пример: ./scripts/compress-videos.sh ~/Downloads/video.mp4 video-2
#
# Требования: ffmpeg (brew install ffmpeg)
# Результат: static/videos/<output-name>.mp4 + static/videos/<output-name>.jpg (постер)

set -e

if [ $# -lt 2 ]; then
  echo "Использование: $0 <input.mp4> <output-name>"
  echo "Пример: $0 ~/Downloads/video.mp4 video-2"
  exit 1
fi

INPUT="$1"
NAME="$2"
OUT_DIR="static/videos"

mkdir -p "$OUT_DIR"

OUT_VIDEO="$OUT_DIR/$NAME.mp4"
OUT_POSTER="$OUT_DIR/$NAME.jpg"

echo "🎬 Сжимаем видео: $INPUT → $OUT_VIDEO"
ffmpeg -i "$INPUT" \
  -c:v libx264 \
  -preset slow \
  -crf 28 \
  -vf "scale=720:-2" \
  -c:a aac \
  -b:a 96k \
  -movflags +faststart \
  "$OUT_VIDEO" \
  -y

echo "🖼️  Создаём постер: $OUT_POSTER"
ffmpeg -i "$INPUT" \
  -ss 00:00:01 \
  -vframes 1 \
  -q:v 5 \
  "$OUT_POSTER" \
  -y

ORIG_SIZE=$(du -h "$INPUT" | cut -f1)
NEW_SIZE=$(du -h "$OUT_VIDEO" | cut -f1)
POSTER_SIZE=$(du -h "$OUT_POSTER" | cut -f1)

echo ""
echo "✅ Готово!"
echo "   Оригинал:    $ORIG_SIZE"
echo "   Сжатое:      $NEW_SIZE"
echo "   Постер:      $POSTER_SIZE"
echo "   Путь видео:  $OUT_VIDEO"
echo "   Путь постера: $OUT_POSTER"

# Обновляем манифест (список всех видео для компонента VideoSection)
node -e "
const fs = require('fs');
const dir = '$OUT_DIR';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.mp4')).sort();
const manifest = files.map(f => ({
  src: '/videos/' + f,
  poster: '/videos/' + f.replace('.mp4', '.jpg')
}));
fs.writeFileSync(dir + '/manifest.json', JSON.stringify(manifest, null, 2));
console.log('📋 Манифест обновлён: ' + manifest.length + ' видео');
"
