import type { CatalogFilters, CatalogScope } from '$lib/server/catalogApi';
import { fetchProducts } from '$lib/server/catalogApi';
import { sql } from '$lib/db';
import {
  DEFAULT_CART_DISCOUNT_PERCENT,
  DEFAULT_EXCLUDED_BRANDS
} from '$lib/utils/pricing';
import { toDbPrice } from '$lib/utils/formatPrice';
import { getSeoOverride, safeCanonical } from '$lib/server/seoOverrides';
import { looksLikeHtml, sanitizeSectionHtml } from '$lib/server/sanitizeSectionHtml';
import { titleFromH1, descriptionFromH1 } from '$lib/server/metaFromH1';

// SEO-лендинги каталога: разделы сверх дерева категорий (прецеденты —
// /catalog/vytyazhki и /catalog/mikrovolnovye-pechi, они здесь же как legacy).
// Товары собираются запросом (scopes/типы/спеки), в самих товарах ничего не
// проставляется — синк Тетриса лендинги не трогает.
// SEO-набор (H1 + текст раздела) живёт в seo_overrides по ключу landing:{path}.

export interface SeoLandingNav {
  name: string;
  slug: string;
  href: string;
}

export interface SeoLanding {
  /** путь без /catalog/ */
  path: string;
  /** название раздела: H1-фолбэк и имя в админке/sitemap */
  title: string;
  scopes: CatalogScope[];
  /** фильтр по типу товара (product_type) */
  types?: string[];
  /** точное совпадение спеки, например «Тип» = «автоматическая» */
  specEquals?: { key: string; value: string };
  /** базовые ограничения габаритов, сужаются пользовательскими фильтрами URL */
  baseSpecs?: Record<string, { min?: number; max?: number }>;
  breadcrumbs: { name: string; href?: string }[];
  /** подсекции в сайдбаре (CategoryNav) */
  nav: SeoLandingNav[];
}

const KB = 'krupnaya-bytovaya-tehnika';
const VT = 'vstraivaemaya-tehnika';

export const seoLandings: SeoLanding[] = [
  {
    // legacy-лендинг (свой роут с давних времён) — в реестре ради layout/sitemap/админки
    path: 'vytyazhki',
    title: 'Кухонные вытяжки',
    scopes: [{ rootSlug: 'kuhonnye-vytyazhki' }],
    breadcrumbs: [
      { name: 'Главная', href: '/' },
      { name: 'Каталог', href: '/catalog' },
      { name: 'Вытяжки' }
    ],
    nav: [
      {
        name: 'Вытяжки встраиваемые',
        slug: 'vytyazhki-vstraivaemye',
        href: '/catalog/kuhonnye-vytyazhki/vytyazhki-vstraivaemye'
      },
      {
        name: 'Вытяжки отдельностоящие',
        slug: 'vytyazhki-otdelnostoyaschie',
        href: '/catalog/kuhonnye-vytyazhki/vytyazhki-otdelnostoyaschie'
      }
    ]
  },
  {
    // legacy-лендинг
    path: 'mikrovolnovye-pechi',
    title: 'Микроволновые печи',
    scopes: [
      { rootSlug: 'melkaya-bytovaya-tehnika', groupSlug: 'mikrovolnovye-pechi' },
      { rootSlug: VT, groupSlug: 'mikrovolnovye-pechi' }
    ],
    breadcrumbs: [
      { name: 'Главная', href: '/' },
      { name: 'Каталог', href: '/catalog' },
      { name: 'Микроволновые печи' }
    ],
    nav: [
      {
        name: 'Отдельностоящие микроволновые печи',
        slug: 'otdelnostoyaschie-mikrovolnovye-pechi',
        href: '/catalog/melkaya-bytovaya-tehnika/mikrovolnovye-pechi'
      },
      {
        name: 'Встраиваемые микроволновые печи',
        slug: 'vstraivaemye-mikrovolnovye-pechi',
        href: '/catalog/vstraivaemaya-tehnika/mikrovolnovye-pechi/vstraivaemye-mikrovolnovye-pechi'
      }
    ]
  },
  // ——— Новые GEO-разделы (ноябрь 2026) ———
  {
    path: 'krupnaya-bytovaya-tehnika/holodilniki-i-morozilniki/holodilniki',
    title: 'Холодильники',
    scopes: [
      { rootSlug: KB, groupSlug: 'holodilniki-i-morozilniki', leafSlug: 'odnokamernye-holodilniki' },
      { rootSlug: KB, groupSlug: 'holodilniki-i-morozilniki', leafSlug: 'dvuhkamernye-holodilniki' },
      { rootSlug: KB, groupSlug: 'holodilniki-i-morozilniki', leafSlug: 'trehkamernye-holodilniki' },
      { rootSlug: KB, groupSlug: 'holodilniki-i-morozilniki', leafSlug: 'holodilniki-side-bu-side' }
    ],
    breadcrumbs: [
      { name: 'Главная', href: '/' },
      { name: 'Каталог', href: '/catalog' },
      { name: 'Холодильники и морозильники', href: '/catalog/krupnaya-bytovaya-tehnika/holodilniki-i-morozilniki' },
      { name: 'Холодильники' }
    ],
    nav: [
      { name: 'Однокамерные холодильники', slug: 'odnokamernye', href: '/catalog/krupnaya-bytovaya-tehnika/holodilniki-i-morozilniki/odnokamernye-holodilniki' },
      { name: 'Двухкамерные холодильники', slug: 'dvuhkamernye', href: '/catalog/krupnaya-bytovaya-tehnika/holodilniki-i-morozilniki/dvuhkamernye-holodilniki' },
      { name: 'Трехкамерные холодильники', slug: 'trehkamernye', href: '/catalog/krupnaya-bytovaya-tehnika/holodilniki-i-morozilniki/trehkamernye-holodilniki' },
      { name: 'Холодильники Side-by-Side', slug: 'side-bu-side', href: '/catalog/krupnaya-bytovaya-tehnika/holodilniki-i-morozilniki/holodilniki-side-bu-side' },
      { name: 'Морозильные камеры', slug: 'morozilnye-kamery', href: '/catalog/krupnaya-bytovaya-tehnika/holodilniki-i-morozilniki/morozilnye-kamery' },
      { name: 'Морозильные лари', slug: 'morozilnye-lari', href: '/catalog/krupnaya-bytovaya-tehnika/holodilniki-i-morozilniki/morozilnye-lari' }
    ]
  },
  {
    path: 'krupnaya-bytovaya-tehnika/stiralnye-i-sushilnye-mashiny/stiralnye-mashiny',
    title: 'Стиральные машины',
    scopes: [
      { rootSlug: KB, groupSlug: 'stiralnye-i-sushilnye-mashiny', leafSlug: 'frontalnye-stiralnye-mashiny' },
      { rootSlug: KB, groupSlug: 'stiralnye-i-sushilnye-mashiny', leafSlug: 'vertikalnye-stiralnye-mashiny' },
      { rootSlug: VT, groupSlug: 'stiralnye-i-sushilnye-mashiny', leafSlug: 'stiralnye-mashiny' }
    ],
    breadcrumbs: [
      { name: 'Главная', href: '/' },
      { name: 'Каталог', href: '/catalog' },
      { name: 'Стиральные и сушильные машины', href: '/catalog/krupnaya-bytovaya-tehnika/stiralnye-i-sushilnye-mashiny' },
      { name: 'Стиральные машины' }
    ],
    nav: [
      { name: 'С фронтальной загрузкой', slug: 'frontalnye', href: '/catalog/krupnaya-bytovaya-tehnika/stiralnye-i-sushilnye-mashiny/frontalnye-stiralnye-mashiny' },
      { name: 'С вертикальной загрузкой', slug: 'vertikalnye', href: '/catalog/krupnaya-bytovaya-tehnika/stiralnye-i-sushilnye-mashiny/vertikalnye-stiralnye-mashiny' },
      { name: 'Стирально-сушильные', slug: 'stiralno-sushilnye', href: '/catalog/krupnaya-bytovaya-tehnika/stiralnye-i-sushilnye-mashiny/stiralno-sushilnye-mashiny' },
      { name: 'Сушильные машины', slug: 'sushilnye-mashiny', href: '/catalog/krupnaya-bytovaya-tehnika/stiralnye-i-sushilnye-mashiny/sushilnye-mashiny' },
      { name: 'Сушильные шкафы', slug: 'sushilnye-shkafy', href: '/catalog/krupnaya-bytovaya-tehnika/stiralnye-i-sushilnye-mashiny/sushilnye-shkafy' },
      { name: 'Встраиваемые стиральные', slug: 'vstraivaemye-stiralnye', href: '/catalog/vstraivaemaya-tehnika/stiralnye-i-sushilnye-mashiny/stiralnye-mashiny' }
    ]
  },
  {
    path: 'kofemashiny',
    title: 'Кофемашины для дома',
    scopes: [{ rootSlug: VT, groupSlug: 'kofemashiny' }],
    breadcrumbs: [
      { name: 'Главная', href: '/' },
      { name: 'Каталог', href: '/catalog' },
      { name: 'Кофемашины для дома' }
    ],
    nav: [
      { name: 'Автоматические кофемашины', slug: 'avtomaticheskie', href: '/catalog/kofemashiny/avtomaticheskie' },
      { name: 'Встраиваемые кофемашины', slug: 'vstraivaemye-kofemashiny', href: '/catalog/vstraivaemaya-tehnika/kofemashiny/vstraivaemye-kofemashiny' }
    ]
  },
  {
    path: 'kofemashiny/avtomaticheskie',
    title: 'Автоматические кофемашины',
    scopes: [{ rootSlug: VT, groupSlug: 'kofemashiny' }],
    specEquals: { key: 'Тип', value: 'автоматическая' },
    breadcrumbs: [
      { name: 'Главная', href: '/' },
      { name: 'Каталог', href: '/catalog' },
      { name: 'Кофемашины для дома', href: '/catalog/kofemashiny' },
      { name: 'Автоматические кофемашины' }
    ],
    nav: [
      { name: 'Все кофемашины для дома', slug: 'vse-kofemashiny', href: '/catalog/kofemashiny' },
      { name: 'Встраиваемые кофемашины', slug: 'vstraivaemye-kofemashiny', href: '/catalog/vstraivaemaya-tehnika/kofemashiny/vstraivaemye-kofemashiny' }
    ]
  },
  {
    path: 'krupnaya-bytovaya-tehnika/posudomoechnye-mashiny/posudomoechnye-mashiny-45-sm',
    title: 'Посудомоечные машины 45 см',
    scopes: [
      { rootSlug: KB, groupSlug: 'posudomoechnye-mashiny' },
      { rootSlug: VT, groupSlug: 'posudomoechnye-mashiny' }
    ],
    // узкий класс 45 см: реальные ширины 44.5–45, компактные 55 сюда не попадают
    baseSpecs: { width: { min: 40, max: 48 } },
    breadcrumbs: [
      { name: 'Главная', href: '/' },
      { name: 'Каталог', href: '/catalog' },
      { name: 'Посудомоечные машины', href: '/catalog/krupnaya-bytovaya-tehnika/posudomoechnye-mashiny' },
      { name: 'Посудомоечные машины 45 см' }
    ],
    nav: [
      { name: 'Посудомоечные машины 60 см', slug: 'pm-60', href: '/catalog/krupnaya-bytovaya-tehnika/posudomoechnye-mashiny/posudomoechnye-mashiny-60-sm' },
      { name: 'Все посудомоечные машины', slug: 'vse-pm', href: '/catalog/krupnaya-bytovaya-tehnika/posudomoechnye-mashiny' },
      { name: 'Встраиваемые посудомоечные', slug: 'vt-pm', href: '/catalog/vstraivaemaya-tehnika/posudomoechnye-mashiny' }
    ]
  },
  {
    path: 'krupnaya-bytovaya-tehnika/posudomoechnye-mashiny/posudomoechnye-mashiny-60-sm',
    title: 'Посудомоечные машины 60 см',
    scopes: [
      { rootSlug: KB, groupSlug: 'posudomoechnye-mashiny' },
      { rootSlug: VT, groupSlug: 'posudomoechnye-mashiny' }
    ],
    // полноразмерный класс 60 см: реальные ширины 59.5–60, компактные 55 исключены
    baseSpecs: { width: { min: 58, max: 65 } },
    breadcrumbs: [
      { name: 'Главная', href: '/' },
      { name: 'Каталог', href: '/catalog' },
      { name: 'Посудомоечные машины', href: '/catalog/krupnaya-bytovaya-tehnika/posudomoechnye-mashiny' },
      { name: 'Посудомоечные машины 60 см' }
    ],
    nav: [
      { name: 'Посудомоечные машины 45 см', slug: 'pm-45', href: '/catalog/krupnaya-bytovaya-tehnika/posudomoechnye-mashiny/posudomoechnye-mashiny-45-sm' },
      { name: 'Все посудомоечные машины', slug: 'vse-pm', href: '/catalog/krupnaya-bytovaya-tehnika/posudomoechnye-mashiny' },
      { name: 'Встраиваемые посудомоечные', slug: 'vt-pm', href: '/catalog/vstraivaemaya-tehnika/posudomoechnye-mashiny' }
    ]
  }
];

export function findSeoLandingByPath(pathWithoutCatalog: string): SeoLanding | null {
  return seoLandings.find((l) => l.path === pathWithoutCatalog) ?? null;
}

/** базовые габариты лендинга, пересечённые с пользовательскими фильтрами URL */
function mergeLandingSpecs(
  landing: SeoLanding,
  userSpecs: Record<string, { min?: number; max?: number }> | undefined
): Record<string, { min?: number; max?: number }> | undefined {
  if (!landing.baseSpecs && !userSpecs) return undefined;
  const merged: Record<string, { min?: number; max?: number }> = {};
  const keys = new Set([...Object.keys(landing.baseSpecs ?? {}), ...Object.keys(userSpecs ?? {})]);
  for (const key of keys) {
    const base = landing.baseSpecs?.[key];
    const user = userSpecs?.[key];
    if (!base && !user) continue;
    merged[key] = {
      ...(base?.min != null || user?.min != null
        ? { min: Math.max(base?.min ?? -Infinity, user?.min ?? -Infinity) }
        : {}),
      ...(base?.max != null || user?.max != null
        ? { max: Math.min(base?.max ?? Infinity, user?.max ?? Infinity) }
        : {})
    };
  }
  return Object.keys(merged).length ? merged : undefined;
}

/** постраничная выборка с URL-фильтрами, как на обычных категориях */
async function fetchLandingPage(landing: SeoLanding, url: URL) {
  const sortParam = url.searchParams.get('sort');
  const sort = sortParam === 'price_asc' || sortParam === 'price_desc' ? sortParam : 'default';
  const filters: CatalogFilters = {
    catalogScopes: landing.scopes,
    ...(landing.types?.length ? { types: landing.types } : {}),
    ...(landing.specEquals ? { specEquals: landing.specEquals } : {}),
    brands: url.searchParams.getAll('brand').map((item) => item.trim()).filter(Boolean),
    colors: url.searchParams.getAll('color').map((item) => item.trim()).filter(Boolean),
    priceMin: toDbPrice(url.searchParams.get('price_min')),
    priceMax: toDbPrice(url.searchParams.get('price_max')),
    specs: mergeLandingSpecs(landing, buildUrlSpecs(url)),
    sort
  };
  const perPage = 24;
  let page = url.searchParams.has('page') ? Number(url.searchParams.get('page')) : 1;
  if (!Number.isFinite(page) || page < 1) page = 1;
  const firstLoad = await fetchProducts(filters, 1, 0);
  const total = firstLoad.total;
  const pages = Math.max(1, Math.ceil(total / perPage));
  if (page > pages) page = pages;
  const offset = (page - 1) * perPage;
  const { products } = await fetchProducts(filters, perPage, offset);
  return { products, total, page, pages, perPage, filters, currentSearch: url.searchParams.toString() };
}

function buildUrlSpecs(url: URL): Record<string, { min?: number; max?: number }> | undefined {
  const specs: Record<string, { min?: number; max?: number }> = {};
  const num = (name: string) => {
    const raw = url.searchParams.get(name);
    if (raw == null || raw === '') return undefined;
    const value = Number(raw);
    return Number.isFinite(value) ? value : undefined;
  };
  const pairs: [string, string, string][] = [
    ['width', 'width_min', 'width_max'],
    ['height', 'height_min', 'height_max'],
    ['depth', 'depth_min', 'depth_max']
  ];
  for (const [field, minKey, maxKey] of pairs) {
    const min = num(minKey);
    const max = num(maxKey);
    if (min != null || max != null) {
      specs[field] = {
        ...(min != null ? { min: Math.floor(min) } : {}),
        ...(max != null ? { max: Math.ceil(max) } : {})
      };
    }
  }
  return Object.keys(specs).length ? specs : undefined;
}

/** есть ли на URL фильтры поверх базового набора лендинга (для canonical/noindex).
 *  Габарит, совпадающий с базой лендинга (например width 40–48 у ПМ 45 см), фильтром не считается. */
function hasAppliedFilters(landing: SeoLanding, url: URL): boolean {
  const quick = ['type', 'brand', 'color', 'price_min', 'price_max'];
  if (quick.some((key) => url.searchParams.has(key))) return true;
  const dims: [string, string, string][] = [
    ['width', 'width_min', 'width_max'],
    ['height', 'height_min', 'height_max'],
    ['depth', 'depth_min', 'depth_max']
  ];
  const base = landing.baseSpecs ?? {};
  for (const [field, minKey, maxKey] of dims) {
    if (!url.searchParams.has(minKey) && !url.searchParams.has(maxKey)) continue;
    const b = base[field];
    const minOk =
      !url.searchParams.has(minKey) || Number(url.searchParams.get(minKey)) === b?.min;
    const maxOk =
      !url.searchParams.has(maxKey) || Number(url.searchParams.get(maxKey)) === b?.max;
    if (!b || !minOk || !maxOk) return true;
  }
  return false;
}

export interface CatalogLandingData {
  products: Awaited<ReturnType<typeof fetchProducts>>['products'];
  total: number;
  page: number;
  pages: number;
  perPage: number;
  currentSearch: string;
  title: string;
  category: string;
  seoTitle: string | null;
  seoH1: string | null;
  metaDescription: string | null;
  canonical: string | null;
  noindex: boolean;
  isCatalogLanding: boolean;
  breadcrumbs: { name: string; href?: string }[];
  bonusPercent: number;
  excludedBrands: string[];
  seo: { heading: string; paragraphs?: string[]; sectionHtml?: string } | null;
}

/** общий загрузчик SEO-лендинга: товары + мета (seo_overrides → из H1 → фолбэк) + «О разделе» */
export async function loadSeoLandingPage(
  landing: SeoLanding,
  url: URL,
  siteOrigin: string
): Promise<CatalogLandingData> {
  const { products, total, page, pages, perPage, currentSearch } = await fetchLandingPage(
    landing,
    url
  );

  const landingPath = `/catalog/${landing.path}`;
  const metaO = await getSeoOverride(`landing:${landing.path}`);
  const h1 = metaO?.h1?.trim() || landing.title;
  const filtered = hasAppliedFilters(landing, url);
  const canonical = metaO?.canonical
    ? safeCanonical(metaO.canonical, siteOrigin)
    : safeCanonical(filtered || page > 1 ? landingPath : url.pathname, siteOrigin);

  // «О разделе»: HTML сеошника → sanitized, плоский текст → абзацы
  let seo: CatalogLandingData['seo'] = null;
  const sectionText = metaO?.section_text ?? null;
  if (sectionText) {
    if (looksLikeHtml(sectionText)) {
      const html = sanitizeSectionHtml(sectionText);
      if (html.trim()) seo = { heading: landing.title, sectionHtml: html };
    } else {
      const paragraphs = sectionText
        .split(/\n\s*\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (paragraphs.length) seo = { heading: landing.title, paragraphs };
    }
  }

  // бонус как на категориях (процент из настроек)
  let bonusPercent = DEFAULT_CART_DISCOUNT_PERCENT;
  let excludedBrands: string[] = DEFAULT_EXCLUDED_BRANDS;
  try {
    const rows = await sql`SELECT key, value FROM settings WHERE key IN ('cart_discount_percent', 'excluded_brands')`;
    for (const row of rows) {
      if (row.key === 'cart_discount_percent') bonusPercent = Number(row.value) || 0;
      if (row.key === 'excluded_brands') {
        try {
          excludedBrands = JSON.parse(row.value);
        } catch {
          // оставляем дефолт
        }
      }
    }
  } catch {
    // настроек нет — дефолт
  }

  return {
    products,
    total,
    page,
    pages,
    perPage,
    currentSearch,
    title: landing.title,
    category: landing.title,
    seoTitle: metaO?.title || titleFromH1(h1),
    seoH1: h1,
    metaDescription: metaO?.description || descriptionFromH1(h1),
    canonical,
    noindex: filtered || page > 1,
    isCatalogLanding: true,
    breadcrumbs: landing.breadcrumbs,
    bonusPercent,
    excludedBrands,
    seo
  };
}
