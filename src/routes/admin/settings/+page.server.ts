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

  // Загружаем список брендов из brands.json
  let allBrands: string[] = [];
  try {
    const brandsPath = path.resolve(process.cwd(), 'scripts/sync-tetrasis-products/brands.json');
    allBrands = JSON.parse(fs.readFileSync(brandsPath, 'utf-8'));
  } catch {
    // файл не найден — пустой список
  }

  return { settings, allBrands };
};
