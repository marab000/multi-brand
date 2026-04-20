import { brandAliases } from './brands';
import { synonyms } from './synonyms';

function replaceSimilarLetters(text: string) {
  return text
    .replace(/A/g, 'А')
    .replace(/a/g, 'а')
    .replace(/B/g, 'В')
    .replace(/E/g, 'Е')
    .replace(/e/g, 'е')
    .replace(/K/g, 'К')
    .replace(/k/g, 'к')
    .replace(/M/g, 'М')
    .replace(/H/g, 'Н')
    .replace(/O/g, 'О')
    .replace(/o/g, 'о')
    .replace(/P/g, 'Р')
    .replace(/p/g, 'р')
    .replace(/C/g, 'С')
    .replace(/c/g, 'с')
    .replace(/T/g, 'Т')
    .replace(/X/g, 'Х')
    .replace(/x/g, 'х')
    .replace(/Y/g, 'У')
    .replace(/y/g, 'у');
}

export function normalize(text: string) {
  return replaceSimilarLetters(String(text || ''))
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[«»"'`´]/g, ' ')
    .replace(/[(){}\[\],.;:+!?/\\|]/g, ' ')
    .replace(/&/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenize(text: string) {
  return normalize(text).split(' ').filter(Boolean);
}

export function resolveBrands(text: string) {
  const normalized = normalize(text);
  if (!normalized) return [];
  const tokens = tokenize(normalized);
  const pool = new Set<string>([normalized, ...tokens]);
  const result = new Set<string>();
  for (const canonical in brandAliases) {
    const aliases = brandAliases[canonical].map(normalize).filter(Boolean);
    const matched = aliases.some((alias) => {
      if (!alias) return false;
      if (pool.has(alias)) return true;
      if (normalized.includes(alias)) return true;
      return alias.includes(normalized) && normalized.length >= 3;
    });
    if (matched) {
      result.add(canonical);
      aliases.forEach((alias) => result.add(alias));
    }
  }
  return Array.from(result);
}

export function expandQuery(text: string): string[] {
  const normalized = normalize(text);
  if (!normalized) return [];
  const result = new Set<string>([normalized]);
  const tokens = tokenize(normalized);
  tokens.forEach((token) => {
    if (token.length >= 2) result.add(token);
  });
  for (const key in synonyms) {
    const normalizedKey = normalize(key);
    const values = synonyms[key].map(normalize).filter(Boolean);
    const keyMatched = normalized === normalizedKey || normalized.includes(normalizedKey) || normalizedKey.includes(normalized) || tokens.includes(normalizedKey);
    const valueMatched = values.some((value) => normalized === value || normalized.includes(value) || value.includes(normalized) || tokens.includes(value));
    if (keyMatched || valueMatched) {
      result.add(normalizedKey);
      values.forEach((value) => result.add(value));
    }
  }
  resolveBrands(normalized).forEach((value) => result.add(value));
  return Array.from(result).filter((item) => item.length >= 2);
}