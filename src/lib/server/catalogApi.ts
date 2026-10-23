import { sql } from '$lib/db';
import { normalize, expandQuery, resolveBrands } from '$lib/search/normalize';
import { brandAliases } from '$lib/search/brands';
import { synonyms } from '$lib/search/synonyms';

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
  excludeKits?: boolean;
  brands?: string[];
  /** Бренды, которые исключаются из выдачи (blacklist) */
  excludedBrands?: string[];
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

  // Слова одного синоним-набора — OR-формы друг друга, а не отдельные AND-группы:
  // «холодильник» должен находить «морозильник», а не требовать оба слова в имени.
  const wordToSynonymBags = new Map<string, Set<string>[]>();
  // индекс по 5-символьному префиксу — для словоформ («духовку» → набор «духовой шкаф»)
  const prefixToBags = new Map<string, Set<string>[]>();
  for (const key in synonyms) {
    const bag = new Set<string>();
    for (const member of [key, ...synonyms[key]]) {
      for (const word of normalize(member).split(' ')) {
        if (word.length >= 2) bag.add(word);
      }
    }
    for (const word of bag) {
      if (!wordToSynonymBags.has(word)) wordToSynonymBags.set(word, []);
      wordToSynonymBags.get(word)!.push(bag);
      if (word.length >= 6) {
        const p = word.slice(0, 5);
        if (!prefixToBags.has(p)) prefixToBags.set(p, []);
        if (!prefixToBags.get(p)!.includes(bag)) prefixToBags.get(p)!.push(bag);
      }
    }
  }
  // наборы синонимов для слова: точное вхождение либо совпадение по префиксу
  function bagsForWord(word: string): Set<string>[] {
    const exact = wordToSynonymBags.get(word);
    if (exact) return exact;
    if (word.length < 6) return [];
    return prefixToBags.get(word.slice(0, 5)) ?? [];
  }
  function shareSynonym(a: string, b: string): boolean {
    const wordB = normalize(b);
    for (const bag of bagsForWord(a)) {
      if (bag.has(wordB)) return true;
      if (wordB.length >= 6) {
        const p = wordB.slice(0, 5);
        for (const member of bag) {
          if (member.length >= 6 && member.slice(0, 5) === p) return true;
        }
      }
    }
    return false;
  }

  // Слова пользователя — сами по себе AND-группы, не OR-формы других слов запроса:
  // иначе «машина» из «сушильная машина» превратила бы группу «сушильная» в «любая машина».
  const rawWordNorms = new Set(rawWords.map((w) => normalize(w)));

  const groups: string[][] = [];
  for (const rawWord of rawWords) {
    const forms = new Set<string>([rawWord]);
    const norm = normalize(rawWord);
    forms.add(norm);
    // весь синоним-набор слова целиком как OR-формы: «варка» тянет варочную/поверхность/
    // панель/индукцию (фразы из набора не доходили до форм — только одиночные слова).
    // Слова-прилагательные (-ая/-яя/-ый/-ий/-ой) в формы не берём: иначе «встраиваемая»
    // из набора «стиральная машина» матчит любую встраиваемую технику.
    for (const bag of bagsForWord(norm)) {
      for (const word of bag) {
        if (rawWordNorms.has(word) || /(?:ая|яя|ый|ий|ой)$/.test(word)) continue;
        forms.add(word);
      }
    }
    for (const w of normalizedWords) {
      // Объединяем, если нормформа совпадает, это alias того же бренда
      // или слово из того же синоним-набора — но не отдельное слово запроса
      if (
        w === norm ||
        normalize(w) === norm ||
        ((shareBrand(rawWord, w) || shareSynonym(norm, w)) && !rawWordNorms.has(normalize(w)))
      )
        forms.add(w);
    }
    groups.push([...forms]);
  }
  // ВАЖНО: «нераспознанные» слова из expandQuery (алиасы брендов, синонимы-фразы)
  // НЕ должны превращаться в отдельные AND-группы — иначе поиск «варка» требовал бы
  // в имени «кофеварку» (алиас того же семантического поля) и всегда отдавал 0.
  return groups;
}

export function buildWhere(filters: CatalogFilters, initialValues: any[] = []) {
  const conditions: string[] = [];
  // initialValues — уже добавленные параметры (например, поисковая строка),
  // чтобы плейсхолдеры $n совпадали с реальными индексами
  const values: any[] = [...initialValues];
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
  // excludeKits — спрятать комплекты из поисковой выдачи (категории и прямые ссылки работают как раньше)
  if (filters.excludeKits) {
    conditions.push(`LOWER(TRIM(COALESCE(p.product_type, ''))) NOT LIKE 'комплект%'`);
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
  if (filters.excludedBrands?.length) {
    const uniq = Array.from(
      new Set(filters.excludedBrands.map((b) => b.trim().toLowerCase()).filter(Boolean))
    );
    values.push(uniq);
    conditions.push(
      `(COALESCE(p.brand->>'name', '') = '' OR LOWER(TRIM(p.brand->>'name')) <> ANY($${values.length}::text[]))`
    );
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

/** Лёгкий подсчёт total: без JOIN к картинкам и без выборки полей.
 *  WHERE каталога не использует product_images, поэтому результат идентичен. */
export async function countProducts(filters: CatalogFilters): Promise<number> {
  try {
    // в отличие от fetchProducts, COUNT не использует поисковую строку в ORDER BY,
    // поэтому слот под неё резервировать нельзя: неиспользуемый $1 → Postgres 42P18
    const { whereClause, values } = buildWhere(filters);
    const query = `
      SELECT COUNT(*) AS total
      FROM products p
      ${whereClause}
    `;
    const rows = await sql.unsafe(query, values);
    return rows.length ? Number(rows[0].total) : 0;
  } catch (err) {
    console.error('❌ COUNT SQL ERROR:', err);
    throw err;
  }
}

export async function fetchProducts(filters: CatalogFilters, limit = 50, offset = 0) {
  try {
    // Поисковая строка идёт первым параметром, чтобы buildWhere
    // сразу строил плейсхолдеры с правильными индексами
    const initialValues: any[] = [];
    let searchParamIdx: number | undefined;
    if (filters.search?.trim()) {
      initialValues.push(filters.search.trim());
      searchParamIdx = initialValues.length;
    }
    const { whereClause, values } = buildWhere(filters, initialValues);
    const orderBy = buildOrderBy(filters.sort, filters.search, searchParamIdx);
    // без p.raw — полный 1С-дамп не нужен списку карточек и утяжеляет SSR
    const query = `
      SELECT
        p.id, p.external_id, p.name, p.description, p.source,
        p.price_rrc, p.price_opt, p.price_ric, p.stock,
        p.specs, p.category, p.product_type, p.brand,
        p.catalog_root_slug, p.catalog_root_name,
        p.catalog_group_slug, p.catalog_group_name,
        p.catalog_leaf_slug, p.catalog_leaf_name,
        p.created_at, p.updated_at,
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
