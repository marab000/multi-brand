import { getCatalogRoots, type CatalogMatcher } from '$lib/server/categories';
import { normalize, tokenize } from '$lib/search/normalize';
import { brandAliases, brandCanonicalNames } from '$lib/search/brands';

export type SearchSuggestion = {
  type: 'category' | 'brand';
  name: string;
  url: string;
  subtitle?: string;
  score: number;
};

type IndexedCategory = {
  type: 'root' | 'group' | 'leaf';
  name: string;
  rootName: string;
  groupName?: string;
  leafName?: string;
  rootSlug: string;
  groupSlug?: string;
  leafSlug?: string;
  url: string;
  subtitle?: string;
  matchers: CatalogMatcher[];
  searchValues: string[];
};

export type CatalogAvailability = {
  rootSet: Set<string>;
  groupSet: Set<string>;
  leafSet: Set<string>;
  hasRootLevelProducts: Set<string>;
};

function scoreText(query: string, candidate: string) {
  if (!query || !candidate) return 0;
  if (candidate === query) return 120;
  if (candidate.startsWith(query)) return 92;
  if (candidate.includes(query)) return 68;
  const candidateTokens = tokenize(candidate);
  if (candidateTokens.some((token) => token === query)) return 82;
  if (candidateTokens.some((token) => token.startsWith(query))) return 74;
  if (query.length >= 4 && query.includes(candidate)) return 36;
  return 0;
}

function scoreMatchers(query: string, matchers: CatalogMatcher[]) {
  let best = 0;
  for (const matcher of matchers) {
    const value = normalize(matcher.value);
    if (!value) continue;
    if (matcher.type === 'exact' && query === value) best = Math.max(best, 145);
    if (matcher.type === 'startsWith' && (value.startsWith(query) || query.startsWith(value)))
      best = Math.max(best, 108);
    if (matcher.type === 'includes' && (value.includes(query) || query.includes(value)))
      best = Math.max(best, 88);
  }
  return best;
}

function levelBonus(type: IndexedCategory['type']) {
  if (type === 'group') return 16;
  if (type === 'leaf') return 6;
  return 0;
}

function buildCategoryIndex() {
  const items: IndexedCategory[] = [];
  for (const root of getCatalogRoots()) {
    items.push({
      type: 'root',
      name: root.name,
      rootName: root.name,
      rootSlug: root.slug,
      url: `/catalog/${root.slug}`,
      subtitle: 'Раздел каталога',
      matchers: [],
      searchValues: [normalize(root.name)]
    });
    for (const group of root.groups) {
      if (!group.isDefault) {
        items.push({
          type: 'group',
          name: group.name,
          rootName: root.name,
          groupName: group.name,
          rootSlug: root.slug,
          groupSlug: group.slug,
          url: `/catalog/${root.slug}/${group.slug}`,
          subtitle: root.name,
          matchers: group.matchers ?? [],
          searchValues: [normalize(group.name), ...group.categories.map(normalize)]
        });
      }
      for (const leaf of group.leaves) {
        items.push({
          type: 'leaf',
          name: leaf.name,
          rootName: root.name,
          groupName: group.name,
          leafName: leaf.name,
          rootSlug: root.slug,
          groupSlug: group.slug,
          leafSlug: leaf.slug,
          url: `/catalog/${root.slug}/${group.slug}/${leaf.slug}`,
          subtitle: `${root.name} / ${group.name}`,
          matchers: leaf.matchers ?? [],
          searchValues: [normalize(leaf.name), ...leaf.productTypes.map(normalize)]
        });
      }
    }
  }
  return items;
}

const categoryIndex = buildCategoryIndex();

function isExcludedCategory(item: IndexedCategory) {
  if (item.rootName === 'Профессиональная техника') return true;
  if (item.type === 'leaf' && item.leafName === 'Холодильники для косметики') return true;
  return false;
}

function isAvailableCategory(item: IndexedCategory, availability?: CatalogAvailability) {
  if (!availability) return true;
  if (item.type === 'root') {
    return (
      availability.rootSet.has(item.rootSlug) &&
      (availability.hasRootLevelProducts.has(item.rootSlug) ||
        availability.groupSet.has(item.rootSlug) ||
        Array.from(availability.groupSet).some((value) => value.startsWith(`${item.rootSlug}::`)))
    );
  }
  if (item.type === 'group') {
    if (!item.groupSlug) return false;
    return (
      availability.groupSet.has(`${item.rootSlug}::${item.groupSlug}`) ||
      Array.from(availability.leafSet).some((value) =>
        value.startsWith(`${item.rootSlug}::${item.groupSlug}::`)
      )
    );
  }
  if (item.type === 'leaf') {
    if (!item.groupSlug || !item.leafSlug) return false;
    return availability.leafSet.has(`${item.rootSlug}::${item.groupSlug}::${item.leafSlug}`);
  }
  return false;
}

function dedupeCategorySuggestions(items: SearchSuggestion[]) {
  const unique = new Map<string, SearchSuggestion>();
  for (const item of items.sort(
    (a, b) => b.score - a.score || a.name.localeCompare(b.name, 'ru')
  )) {
    const key = `${item.type}::${item.url}`;
    if (!unique.has(key)) unique.set(key, item);
  }
  return Array.from(unique.values());
}

export function getCategorySuggestions(
  query: string,
  options?: { limit?: number; availability?: CatalogAvailability }
): SearchSuggestion[] {
  const normalized = normalize(query);
  if (normalized.length < 2) return [];
  const scored = categoryIndex
    .filter((item) => !isExcludedCategory(item))
    .filter((item) => isAvailableCategory(item, options?.availability))
    .map((item) => {
      const textScore = Math.max(
        ...item.searchValues.map((value) => scoreText(normalized, value)),
        0
      );
      const matcherScore = scoreMatchers(normalized, item.matchers);
      const score = Math.max(textScore, matcherScore) + levelBonus(item.type);
      if (score < 60) return null;
      return {
        type: 'category' as const,
        name: item.name,
        url: item.url,
        subtitle: item.subtitle,
        score
      };
    })
    .filter(Boolean) as SearchSuggestion[];
  return dedupeCategorySuggestions(scored).slice(0, options?.limit ?? 4);
}

export function getBrandSuggestions(query: string, limit = 2): SearchSuggestion[] {
  const normalized = normalize(query);
  if (normalized.length < 2) return [];
  const aliasMatches = new Set<string>();
  for (const canonical in brandAliases) {
    const aliases = brandAliases[canonical].map(normalize).filter(Boolean);
    const matched = aliases.some(
      (alias) => normalized === alias || normalized.includes(alias) || alias.includes(normalized)
    );
    if (matched) aliasMatches.add(canonical);
  }
  const suggestions: SearchSuggestion[] = [];
  for (const canonical in brandCanonicalNames) {
    const name = brandCanonicalNames[canonical];
    const textScore = scoreText(normalized, normalize(name));
    const aliasBoost = aliasMatches.has(canonical) ? 30 : 0;
    const score = textScore + aliasBoost;
    if (score >= 65) {
      suggestions.push({
        type: 'brand',
        name,
        url: `/catalog/search?brand=${encodeURIComponent(name)}`,
        subtitle: 'Бренд',
        score
      });
    }
  }
  return suggestions
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'ru'))
    .slice(0, limit);
}
