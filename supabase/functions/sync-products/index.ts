import 'dotenv/config';
import { serve } from 'https://deno.land/std/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

/* ---------------- HELPERS ---------------- */

function getFieldLike(obj: Record<string, any>, keyPart: string) {
  if (!obj) return null;
  const key = Object.keys(obj).find((k) => k.toLowerCase().includes(keyPart.toLowerCase()));
  return key ? obj[key] : null;
}

function toNumber(val: any): number | null {
  if (!val) return null;
  const cleaned = String(val)
    .replace(',', '.')
    .replace(/[^\d.]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/* ---------------- ENV ---------------- */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const API_KEY = Deno.env.get('TETRAIS_API_KEY')!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

/* ---------------- BRANDS FILTER ---------------- */

const NEED_BRANDS = [
  'AEG',
  'ASKO',
  'BEKO',
  'BOSCH',
  'CANDY',
  'Electrolux',
  'ELICA',
  'FABER',
  'FALMEC',
  'Franke',
  'GORENJE',
  'Haier',
  'INDESIT',
  'KRONA',
  'KORTING',
  'LIEBHERR',
  'Midea',
  'MIELE',
  'NEFF',
  'SIEMENS',
  'SMEG',
  'Teka'
];

/* ---------------- MAIN ---------------- */

serve(async () => {
  try {
    /* ===== 1. GET ALL BRANDS ===== */
    const brandsRes = await fetch(`https://tetrasis-bt.ru/exch_api.php?CODE=${API_KEY}`);
    const brandsData = await brandsRes.json();

    const brands = brandsData.filter((b: any) => NEED_BRANDS.includes(b.NAME));

    console.log(
      'Using brands:',
      brands.map((b: any) => b.NAME)
    );

    /* ===== 2. LOOP BRANDS ===== */
    for (const brand of brands) {
      const brandId = brand.ID;

      console.log('SYNC BRAND:', brand.NAME, brandId);

      /* ---------- PRODUCTS ---------- */
      const productsRes = await fetch(`https://tetrasis-bt.ru/download/${API_KEY}/${brandId}/0/`);
      const productsText = await productsRes.text();
      let products = JSON.parse(productsText);
      if (products.products) products = products.products;

      /* ---------- PRICES ---------- */
      const pricesRes = await fetch(`https://tetrasis-bt.ru/download/${API_KEY}/${brandId}/2/`);
      const pricesText = await pricesRes.text();
      const prices = JSON.parse(pricesText);

      // map prices by exact ID
      const priceMap = new Map<string, number>();
      for (const p of prices) {
        if (p['ВидЦены'] === 'РРЦ') {
          priceMap.set(String(p['НоменклатураID']), toNumber(p['Цена']) ?? 0);
        }
      }

      /* ---------- UPSERT ---------- */
      for (const item of products) {
        const extras = item['ДопРеквизиты'] || {};

        const width = getFieldLike(extras, 'Ширина');
        const height = getFieldLike(extras, 'Высота');
        const length = getFieldLike(extras, 'Глубина');

        const price = priceMap.get(String(item.ID)) ?? null;

        await supabase.from('products').upsert(
          {
            external_id: item.ID,
            brand_id: brandId,
            brand_name: brand.NAME,

            name: item['РабочееНаименование'],
            sku: item['Артикул'],
            description: item['ТекстовоеОписание'],

            category: item['ГруппаАналитическогоУчета'],
            product_type: item['ЦеноваяГруппа'],

            price,

            color: extras['Цвет'] ?? null,
            weight: toNumber(item['Вес']),
            width: toNumber(width),
            height: toNumber(height),
            length: toNumber(length),

            raw: item
          },
          { onConflict: 'external_id' }
        );
      }
    }

    return new Response('SYNC OK');
  } catch (e) {
    console.error(e);
    return new Response('ERROR: ' + e.message, { status: 500 });
  }
});
