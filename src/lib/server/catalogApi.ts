import { sql } from '$lib/db';
import { normalize, expandQuery } from '$lib/search/normalize';

export interface CatalogFilters {
  search?: string;
  catalogRootSlug?: string;
  catalogGroupSlug?: string;
  catalogLeafSlug?: string;
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
          OR LOWER(COALESCE(p.product_type,'')) LIKE $${idx}
        `);
      }
      conditions.push(`(${parts.join(' OR ')})`);
    }
  }

  if (filters.catalogLeafSlug) {
    values.push(filters.catalogLeafSlug.toLowerCase());
    conditions.push(`LOWER(TRIM(p.catalog_leaf_slug)) = $${values.length}`);
  } else if (filters.catalogGroupSlug) {
    values.push(filters.catalogGroupSlug.toLowerCase());
    conditions.push(`LOWER(TRIM(p.catalog_group_slug)) = $${values.length}`);
  } else if (filters.catalogRootSlug) {
    values.push(filters.catalogRootSlug.toLowerCase());
    conditions.push(`LOWER(TRIM(p.catalog_root_slug)) = $${values.length}`);
  }

  if (filters.types?.length) {
    const uniq = Array.from(new Set(filters.types.map((t) => t.toLowerCase())));
    values.push(uniq);
    conditions.push(`LOWER(TRIM(p.product_type)) = ANY($${values.length}::text[])`);
  }

  if (filters.brands?.length) {
    const uniq = Array.from(new Set(filters.brands.map((b) => b.toLowerCase())));
    const parts: string[] = [];
    for (const b of uniq) {
      const idx = values.length + 1;
      values.push(b);
      parts.push(`LOWER(TRIM(p.brand->>'name')) = $${idx}`);
    }
    conditions.push(`(${parts.join(' OR ')})`);
  }

  if (filters.colors?.length) {
    const uniq = Array.from(new Set(filters.colors.map((c) => c.toLowerCase())));
    const parts: string[] = [];
    for (const c of uniq) {
      const idx = values.length + 1;
      values.push(c);
      parts.push(`LOWER(TRIM(p.specs->>'Цвет')) = $${idx}`);
    }
    conditions.push(`(${parts.join(' OR ')})`);
  }

  if (filters.priceMin != null) {
    conditions.push(`p.price_rrc >= $${values.length + 1}`);
    values.push(filters.priceMin);
  }
  if (filters.priceMax != null) {
    conditions.push(`p.price_rrc <= $${values.length + 1}`);
    values.push(filters.priceMax);
  }

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
        COALESCE(json_agg(pi ORDER BY pi.position ASC) FILTER (WHERE pi.id IS NOT NULL),'[]') AS images
      FROM products p
      LEFT JOIN product_images pi ON pi.product_id = p.id
      ${whereClause}
      GROUP BY p.id
      ORDER BY 
        CASE WHEN COUNT(pi.id) > 0 THEN 0 ELSE 1 END,
        p.created_at DESC
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
