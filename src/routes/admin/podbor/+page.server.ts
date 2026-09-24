import type { PageServerLoad } from './$types';
import { sql } from '$lib/db';
import fs from 'fs';
import path from 'path';
import { DEFAULT_PODBOR_CONFIG } from '$lib/server/bundlePicker';

export const load: PageServerLoad = async () => {
  let config = DEFAULT_PODBOR_CONFIG;
  try {
    const rows = await sql`SELECT value FROM settings WHERE key = 'podbor_config'`;
    if (rows.length) {
      const parsed = JSON.parse(rows[0].value);
      config = {
        version: 1,
        brands: {
          mode: ['all', 'whitelist', 'blacklist'].includes(parsed?.brands?.mode)
            ? parsed.brands.mode
            : 'all',
          whitelist: Array.isArray(parsed?.brands?.whitelist) ? parsed.brands.whitelist : [],
          blacklist: Array.isArray(parsed?.brands?.blacklist) ? parsed.brands.blacklist : []
        },
        priorityProducts: Array.isArray(parsed?.priorityProducts)
          ? parsed.priorityProducts.map(String)
          : [],
        texts:
          parsed?.texts && typeof parsed.texts === 'object' && !Array.isArray(parsed.texts)
            ? parsed.texts
            : {}
      };
    }
  } catch {
    // нет конфига — дефолт
  }

  let allBrands: string[] = [];
  try {
    const brandsPath = path.resolve(process.cwd(), 'scripts/sync-tetrasis-products/brands.json');
    allBrands = JSON.parse(fs.readFileSync(brandsPath, 'utf-8'));
  } catch {
    // файл не найден — пустой список
  }

  // Данные приоритетных товаров (для карточек)
  let priorityItems: any[] = [];
  if (config.priorityProducts.length) {
    try {
      priorityItems = (await sql`
        SELECT p.id, p.name, p.brand->>'name' AS brand, p.product_type, p.price_rrc, p.price_ric, p.specs,
          (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.position ASC LIMIT 1) AS image
        FROM products p
        WHERE p.id = ANY(${sql.array(config.priorityProducts)}::uuid[])
      `) as any[];
      // Сохраняем порядок из конфига + парсим ширину из specs (значения вида «59,8 см»)
      const widthKeys = ['Размер (Ширина)', 'Размер (Ширина), см', 'Ширина прибора'];
      const parseWidth = (specs: any): number | null => {
        for (const k of widthKeys) {
          const raw = specs?.[k];
          if (raw == null) continue;
          const m = String(raw).replace(',', '.').match(/\d+(\.\d+)?/);
          if (m) return Number(m[0]);
        }
        return null;
      };
      priorityItems = priorityItems.map((p) => ({
        ...p,
        width: parseWidth(p.specs),
        price: (p.price_rrc ?? p.price_ric) != null ? (p.price_rrc ?? p.price_ric) * 1000 : null
      }));
      // Сохраняем порядок из конфига
      const byId = new Map(priorityItems.map((p) => [String(p.id), p]));
      priorityItems = config.priorityProducts
        .map((id: string) => byId.get(id))
        .filter(Boolean) as any[];
    } catch {
      // БД недоступна
    }
  }

  // Скидка за комплект (раньше жила в /admin/settings)
  let discount = { enabled: false, percent: 5 };
  try {
    const rows = await sql`
      SELECT key, value FROM settings
      WHERE key IN ('bundle_discount_enabled', 'bundle_discount_percent')
    `;
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    discount = {
      enabled: map.bundle_discount_enabled === 'true',
      percent: Math.min(30, Math.max(0, Number(map.bundle_discount_percent) || 0))
    };
  } catch {
    // дефолт
  }

  return { config, allBrands, priorityItems, discount };
};
