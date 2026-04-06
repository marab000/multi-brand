import { sql } from '$lib/db';
import { normalize, expandQuery } from '$lib/search/normalize';

export interface CatalogFilters {
  search?: string;
  categories?: string[];
  types?: string[];
  brands?: string[];
  colors?: string[];
  priceMin?: number;
  priceMax?: number;
  specs?: Record<string, { min?: number; max?: number }>;
}

export function buildWhere(filters: CatalogFilters) {
  const conditions: string[] = [];
  const values: any[] = [];

  // SEARCH
  if (filters.search) {
    const normalized = normalize(filters.search);
    const words = expandQuery(normalized).filter((w) => w.length >= 3);
    if (words.length) {
      const parts: string[] = [];
      for (const word of words) {
        const idx = values.length + 1;
        values.push(`%${word.toLowerCase()}%`);
        parts.push(`
          LOWER(p.name) LIKE $${idx}
          OR LOWER(COALESCE(p.description,'')) LIKE $${idx}
          OR LOWER(p.brand->>'name') LIKE $${idx}
        `);
      }
      conditions.push(`(${parts.join(' OR ')})`);
    }
  }

  // BRANDS
  if (filters.brands?.length) {
    const uniq = Array.from(new Set(filters.brands.map(b => b.toLowerCase())));
    const parts: string[] = [];
    for (const b of uniq) {
      const idx = values.length + 1;
      values.push(b);
      parts.push(`LOWER(TRIM(p.brand->>'name')) = $${idx}`);
    }
    conditions.push(`(${parts.join(' OR ')})`);
  }

  // CATEGORIES
  if (filters.categories?.length) {
    const uniq = Array.from(new Set(filters.categories.map(c => c.toLowerCase())));
    values.push(uniq);
    conditions.push(`LOWER(TRIM(p.category)) = ANY($${values.length}::text[])`);
  }

  // TYPES
  if (filters.types?.length) {
    const uniq = Array.from(new Set(filters.types.map(t => t.toLowerCase())));
    values.push(uniq);
    conditions.push(`LOWER(TRIM(p.product_type)) = ANY($${values.length}::text[])`);
  }

  // COLORS
  if (filters.colors?.length) {
    const uniq = Array.from(new Set(filters.colors.map(c => c.toLowerCase())));
    const parts: string[] = [];
    for (const c of uniq) {
      const idx = values.length + 1;
      values.push(c);
      parts.push(`LOWER(TRIM(p.specs->>'Цвет')) = $${idx}`);
    }
    conditions.push(`(${parts.join(' OR ')})`);
  }

  // PRICE
  if (filters.priceMin != null) {
    conditions.push(`p.price_rrc >= $${values.length + 1}`);
    values.push(filters.priceMin);
  }
  if (filters.priceMax != null) {
    conditions.push(`p.price_rrc <= $${values.length + 1}`);
    values.push(filters.priceMax);
  }

  // SPECS NUMERIC
  function specNumericExpr(keys: string[]) {
    if (!keys.length) return 'NULL';
    const exprs = keys.map(
      (k) => `
        CAST(
          NULLIF(
            regexp_replace(
              regexp_replace(
                replace(split_part(p.specs->>'${k}','-',1), ',', '.'),
                '[^0-9\\.]',
                '',
                'g'
              ),
              '\\.(?=.*\\.)',
              '',
              'g'
            ),
          '') AS numeric
        )
      `
    );
    return `COALESCE(${exprs.join(',')})`;
  }

  if (filters.specs) {
    const map: Record<string, string[]> = {
      width: ['Размер (Ширина)', 'Размер (Ширина), см', 'Ширина прибора'],
      height: ['Размер (Высота)', 'Размер (Высота), см', 'Высота прибора'],
      depth: ['Размер (Глубина)', 'Размер (Глубина), см', 'Глубина прибора']
    };
    for (const field in filters.specs) {
      const value = filters.specs[field];
      if (!value) continue;
      const expr = specNumericExpr(map[field]);
      if (value.min != null) {
        conditions.push(`(${expr}) IS NOT NULL AND (${expr}) >= $${values.length + 1}`);
        values.push(value.min);
      }
      if (value.max != null) {
        conditions.push(`(${expr}) IS NOT NULL AND (${expr}) <= $${values.length + 1}`);
        values.push(value.max);
      }
    }
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return { whereClause, values };
}

export async function fetchProducts(filters: CatalogFilters, limit = 50, offset = 0) {
  try {
    const { whereClause, values } = buildWhere(filters);
    const query = `
      SELECT 
        p.*,
        COUNT(*) OVER() AS total_count,
        COALESCE(json_agg(pi) FILTER (WHERE pi.id IS NOT NULL),'[]') AS images
      FROM products p
      LEFT JOIN product_images pi ON pi.product_id = p.id
      ${whereClause}
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    const rows = await sql.unsafe(query, values);
    const total = rows.length ? Number(rows[0].total_count) : 0;
    return { products: rows, total };
  } catch (err) {
    console.error('❌ SQL ERROR:', err);
    throw err;
  }
}