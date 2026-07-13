import { sql } from '$lib/db';
import { normalize, expandQuery, resolveBrands } from '$lib/search/normalize';
import { brandAliases } from '$lib/search/brands';

export interface CatalogScope {
  rootSlug: string;
  groupSlug?: string;
  leafSlug?: string;
}

export interface CatalogFilters {
  search?: string;
  catalogRootSlug?: string;
  catalogGroupSlug?: string;
  catalogLeafSlug?: string;
  catalogScopes?: CatalogScope[];
  types?: string[];
  brands?: string[];
  colors?: string[];
  priceMin?: number;
  priceMax?: number;
  specs?: Record<string, { min?: number; max?: number }>;
  sort?: 'default' | 'price_asc' | 'price_desc';
}

function hasLatin(text: string) {
  return /[a-z]/i.test(text);
}

function hasCyrillic(text: string) {
  return /[а-яё]/i.test(text);
}

function isMixedScript(text: string) {
  return hasLatin(text) && hasCyrillic(text);
}

function getSearchWords(search: string) {
  const raw = search.trim().toLowerCase();
  const rawTokens = raw.split(/\s+/).filter((w) => w.length >= 1);
  const rawHasModelLikeToken = rawTokens.some((w) => /\d/.test(w));
  const rawWords = rawTokens.filter((w) => w.length >= 2 || rawHasModelLikeToken);
  const normalizedWords = expandQuery(normalize(raw)).filter(
    (w) => w.length >= 2 && !w.includes(' ') && !isMixedScript(w)
  );

  // Маппинг: нормализованное слово → набор брендов, которым оно принадлежит
  // (чтобы alias-ы одного бренда попадали в одну группу, а не создавали AND-условия)
  const wordToBrands = new Map<string, Set<string>>();
  for (const canonical in brandAliases) {
    for (const alias of brandAliases[canonical]) {
      const normAlias = normalize(alias);
      if (!wordToBrands.has(normAlias)) wordToBrands.set(normAlias, new Set());
      wordToBrands.get(normAlias)!.add(canonical);
    }
  }
  function brandsOfWord(word: string): Set<string> {
    return wordToBrands.get(normalize(word)) ?? new Set();
  }
  function shareBrand(a: string, b: string): boolean {
    const ba = brandsOfWord(a);
    const bb = brandsOfWord(b);
    if (!ba.size || !bb.size) return false;
    for (const x of ba) if (bb.has(x)) return true;
    return false;
  }

  const groups: string[][] = [];
  for (const rawWord of rawWords) {
    const forms = new Set<string>([rawWord]);
    const norm = normalize(rawWord);
    forms.add(norm);
    for (const w of normalizedWords) {
      // Объединяем, если нормформа совпадает ИЛИ это alias того же бренда
      if (w === norm || normalize(w) === norm || shareBrand(rawWord, w)) forms.add(w);
    }
    groups.push([...forms]);
  }
  const usedForms = new Set<string>(groups.flat());
  for (const w of normalizedWords) {
    if (!usedForms.has(w) && w.length >= 2) groups.push([w]);
  }
  return groups;
}

export function buildWhere(filters: CatalogFilters) {
  const conditions: string[] = [];
  const values: any[] = [];
  if (filters.search?.trim()) {
    const groups = getSearchWords(filters.search);
    if (groups.length) {
      const parts: string[] = [];
      for (const forms of groups) {
        const orParts: string[] = [];
        for (const form of forms) {
          const idx = values.length + 1;
          values.push(`%${form}%`);
          orParts.push(`(
            LOWER(p.name) LIKE $${idx}
            OR LOWER(COALESCE(p.description,'')) LIKE $${idx}
            OR LOWER(COALESCE(p.brand->>'name','')) LIKE $${idx}
            OR LOWER(COALESCE(p.product_type,'')) LIKE $${idx}
            OR LOWER(COALESCE(p.raw->>'Артикул','')) LIKE $${idx}
            OR LOWER(COALESCE(p.raw->>'Код','')) LIKE $${idx}
            OR LOWER(COALESCE(p.raw->>'Штрихкод','')) LIKE $${idx}
          )`);
        }
        parts.push(`(${orParts.join(' OR ')})`);
      }
      conditions.push(`(${parts.join(' AND ')})`);
    }
  }
  if (filters.catalogScopes?.length) {
    const scopeParts: string[] = [];
    for (const scope of filters.catalogScopes) {
      const parts: string[] = [];
      values.push(scope.rootSlug.toLowerCase());
      parts.push(`LOWER(TRIM(p.catalog_root_slug)) = $${values.length}`);
      if (scope.groupSlug) {
        values.push(scope.groupSlug.toLowerCase());
        parts.push(`LOWER(TRIM(p.catalog_group_slug)) = $${values.length}`);
      }
      if (scope.leafSlug) {
        values.push(scope.leafSlug.toLowerCase());
        parts.push(`LOWER(TRIM(p.catalog_leaf_slug)) = $${values.length}`);
      }
      scopeParts.push(`(${parts.join(' AND ')})`);
    }
    conditions.push(`(${scopeParts.join(' OR ')})`);
  } else {
    if (filters.catalogRootSlug) {
      values.push(filters.catalogRootSlug.toLowerCase());
      conditions.push(`LOWER(TRIM(p.catalog_root_slug)) = $${values.length}`);
    }
    if (filters.catalogGroupSlug) {
      values.push(filters.catalogGroupSlug.toLowerCase());
      conditions.push(`LOWER(TRIM(p.catalog_group_slug)) = $${values.length}`);
    }
    if (filters.catalogLeafSlug) {
      values.push(filters.catalogLeafSlug.toLowerCase());
      conditions.push(`LOWER(TRIM(p.catalog_leaf_slug)) = $${values.length}`);
    }
  }
  if (filters.types?.length) {
    const uniq = Array.from(
      new Set(filters.types.map((t) => t.trim().toLowerCase()).filter(Boolean))
    );
    values.push(uniq);
    conditions.push(`LOWER(TRIM(p.product_type)) = ANY($${values.length}::text[])`);
  }
  if (filters.brands?.length) {
    const uniq = Array.from(
      new Set(filters.brands.map((b) => b.trim().toLowerCase()).filter(Boolean))
    );
    const parts: string[] = [];
    for (const b of uniq) {
      const idx = values.length + 1;
      values.push(b);
      parts.push(`LOWER(TRIM(COALESCE(p.brand->>'name', ''))) = $${idx}`);
    }
    if (parts.length) conditions.push(`(${parts.join(' OR ')})`);
  }
  if (filters.colors?.length) {
    const uniq = Array.from(
      new Set(filters.colors.map((c) => c.trim().toLowerCase()).filter(Boolean))
    );
    const parts: string[] = [];
    for (const c of uniq) {
      const idx = values.length + 1;
      values.push(c);
      parts.push(`LOWER(TRIM(p.specs->>'Цвет')) = $${idx}`);
    }
    if (parts.length) conditions.push(`(${parts.join(' OR ')})`);
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

function buildOrderBy(sort?: CatalogFilters['sort'], search?: string, searchParamIdx?: number) {
  // При поиске — товары с точным совпадением имени идут первыми,
  // затем те где имя начинается с запроса, потом остальные.
  const relevance = search?.trim() && searchParamIdx
    ? `
      CASE
        WHEN LOWER(p.name) = LOWER($${searchParamIdx}) THEN 0
        WHEN LOWER(p.name) LIKE LOWER($${searchParamIdx}) || '%' THEN 1
        ELSE 2
      END,
    `
    : '';
  if (sort === 'price_asc') {
    return `
      ORDER BY
        ${relevance}
        CASE WHEN COUNT(pi.id) > 0 THEN 0 ELSE 1 END,
        COALESCE(p.price_rrc, p.price_ric) ASC NULLS LAST,
        p.created_at DESC
    `;
  }
  if (sort === 'price_desc') {
    return `
      ORDER BY
        ${relevance}
        CASE WHEN COUNT(pi.id) > 0 THEN 0 ELSE 1 END,
        COALESCE(p.price_rrc, p.price_ric) DESC NULLS LAST,
        p.created_at DESC
    `;
  }
  return `
    ORDER BY
      ${relevance}
      CASE WHEN COUNT(pi.id) > 0 THEN 0 ELSE 1 END,
      p.created_at DESC
  `;
}

export async function fetchProducts(filters: CatalogFilters, limit = 50, offset = 0) {
  try {
    const { whereClause, values } = buildWhere(filters);
    // Добавляем поисковый запрос для сортировки по релевантности (точное совпадение имени — первым)
    let searchParamIdx: number | undefined;
    if (filters.search?.trim()) {
      values.push(filters.search.trim());
      searchParamIdx = values.length;
    }
    const orderBy = buildOrderBy(filters.sort, filters.search, searchParamIdx);
    const query = `
      SELECT 
        p.*,
        COUNT(*) OVER() AS total_count,
        COALESCE(json_agg(pi ORDER BY pi.position ASC) FILTER (WHERE pi.id IS NOT NULL),'[]') AS images
      FROM products p
      LEFT JOIN product_images pi ON pi.product_id = p.id
      ${whereClause}
      GROUP BY p.id
      ${orderBy}
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
