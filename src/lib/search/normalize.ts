import { synonyms } from './synonyms';

export function normalize(text: string) {
  return text.toLowerCase().trim();
}

export function expandQuery(text: string): string[] {
  const words = text.split(/\s+/);
  const result = new Set<string>();

  for (const word of words) {
    result.add(word);
    for (const key in synonyms) {
      if (word === key || synonyms[key].includes(word)) {
        result.add(key);
        synonyms[key].forEach((s) => result.add(s));
      }
    }
  }

  return Array.from(result);
}
