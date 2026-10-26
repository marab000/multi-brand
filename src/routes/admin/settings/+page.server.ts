import type { PageServerLoad } from './$types';
import { sql } from '$lib/db';
import fs from 'fs';
import path from 'path';

export const load: PageServerLoad = async () => {
  const rows = await sql`SELECT key, value FROM settings`;
  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }

  // Загружаем список брендов из brands.json (формат: [{name, source}])
  let allBrands: string[] = [];
  try {
    const brandsPath = path.resolve(process.cwd(), 'scripts/sync-tetrasis-products/brands.json');
    const raw = JSON.parse(fs.readFileSync(brandsPath, 'utf-8'));
    allBrands = raw.map((b: any) => (typeof b === 'string' ? b : b?.name)).filter(Boolean);
  } catch {
    // файл не найден — пустой список
  }

  return { settings, allBrands };
};
