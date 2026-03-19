import { sql } from '$lib/db';
import { normalize, expandQuery } from '$lib/search/normalize';
import { apiFetch } from '$lib/api';

export interface CatalogFilters {
  search?: string;
  category?: string;
  types?: string[];
  brands?: string[];
  colors?: string[];
  priceMin?: number;
  priceMax?: number;
  specs?: Record<string, { min?: number; max?: number }>; // width, height, depth
}

// === СЕРВЕРНАЯ ЛОГИКА ===
export function buildWhere(filters: CatalogFilters) {
  const conditions: string[] = [];
  const values: any[] = [];

  if (filters.search) {
    const normalized = normalize(filters.search);
    const words = expandQuery(normalized).filter((w) => w.length >= 3);
    if (words.length) {
      const searchCondition = words
        .map(
          (word) => `
        (
          LOWER(p.name) LIKE '%${word}%'
          OR LOWER(COALESCE(p.description,'')) LIKE '%${word}%'
          OR LOWER(p.brand->>'name') LIKE '%${word}%'
        )
      `
        )
        .join(' AND ');
      conditions.push(searchCondition);
    }
  }

  if (filters.category) {
    conditions.push(`trim(p.category)=$${values.length + 1}`);
    values.push(filters.category);
  }

  if (filters.types && filters.types.length) {
    conditions.push(`trim(p.product_type)=ANY($${values.length + 1})`);
    values.push(filters.types);
  }

  if (filters.brands && filters.brands.length) {
    conditions.push(`lower(trim(p.brand->>'name'))=ANY($${values.length + 1})`);
    values.push(filters.brands.map((b) => b.toLowerCase()));
  }

  if (filters.colors && filters.colors.length) {
    conditions.push(`lower(trim(p.specs->>'Цвет'))=ANY($${values.length + 1})`);
    values.push(filters.colors.map((c) => c.toLowerCase()));
  }

  if (filters.priceMin != null) {
    conditions.push(`p.price_rrc >= $${values.length + 1}`);
    values.push(filters.priceMin);
  }
  if (filters.priceMax != null) {
    conditions.push(`p.price_rrc <= $${values.length + 1}`);
    values.push(filters.priceMax);
  }

  // width, height, depth
  function specNumericExpr(keys: string[]) {
    if (!keys || !keys.length) return '0'; // fallback
    const exprs = keys
      .map(
        (k) =>
          `CAST(replace(regexp_replace(split_part(p.specs->>'${k}','-',1),'[^0-9,\\.]','','g'),',','.') AS numeric)`
      )
      .filter(Boolean);
    return exprs.length ? `COALESCE(${exprs.join(',')},0)` : '0';
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
        conditions.push(`${expr} >= $${values.length + 1}`);
        values.push(value.min);
      }
      if (value.max != null) {
        conditions.push(`${expr} <= $${values.length + 1}`);
        values.push(value.max);
      }
    }
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return { whereClause, values };
}

export async function fetchProducts(filters: CatalogFilters, limit = 50, offset = 0) {
  const { whereClause, values } = buildWhere(filters);

  const query = `
    SELECT p.*, COALESCE(json_agg(pi) FILTER (WHERE pi.id IS NOT NULL),'[]') AS images
    FROM products p
    LEFT JOIN product_images pi ON pi.product_id=p.id
    ${whereClause}
    GROUP BY p.id
    ORDER BY p.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const products = await sql.unsafe(query, values);
  const countQuery = `SELECT COUNT(*) AS total FROM products p ${whereClause}`;
  const countResult = await sql.unsafe(countQuery, values);
  const total = Number(countResult[0].total);

  return { products, total };
}

// === КЛИЕНТСКАЯ ОБЁРТКА ===
export async function loadProducts(fetch: typeof globalThis.fetch, query: URLSearchParams) {
  return apiFetch<{
    products: any[];
    total: number;
    pages: number;
    page: number;
    brands?: string[];
    minPrice?: number;
    maxPrice?: number;
  }>(fetch, `/api/products?${query}`).catch(() => ({
    products: [],
    total: 0,
    pages: 1,
    page: 1
  }));
}
