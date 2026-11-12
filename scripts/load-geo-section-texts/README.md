# load-geo-section-texts

> **Это заметка для ZCode-агента (будущего чата), не для человека.**

## Поток

Сеошник присылает партии HTML-файлов с текстами «О разделе» (пример:
`~/Downloads/Multi_Brand_GEO_HTML_November_2026`). Формат новой партии
может отличаться (HTML / xls / word / что угодно) — лоадер писался
под HTML-партии.

## Что делает `load.mjs`

Заливает тексты в `seo_overrides.section_text` на прод-БД:

- меняет **только** `section_text`; перед перезаписью существующих строк
  кладёт бэкап `backup-YYYY-MM-DD.json` рядом
- соответствие «файл сеошника → категория» — объект `MAP` внутри `load.mjs`,
  рядом с ним комментарии, как решены развилки (по дереву каталога и числу
  товаров). Новые файлы → дописать `MAP`
- папка-источник захардкожена в `DEFAULT_DIR` в начале `load.mjs` —
  перед запуском поменять на папку новой партии
- город подставляется при отдаче страницы (`{city_in}` и алиасы,
  `src/lib/server/cityPlaceholders.ts`), в БД текст хранится со скобками
- HTML на сайте рендерится через whitelist-санитайзер
  (`src/lib/server/sanitizeSectionHtml.ts`), лоадер дополнительно
  отклоняет файлы с посторонними тегами

## Запуск

```sh
# пилот на одной странице: сначала dry-run, потом всерьёз
node scripts/load-geo-section-texts/load.mjs --only 02_dvuhkamernye --dry-run
node scripts/load-geo-section-texts/load.mjs --only 02_dvuhkamernye

# вся партия (когда MAP дописан под новую партию)
node scripts/load-geo-section-texts/load.mjs
```
