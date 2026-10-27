import type { Product } from '$lib/types/product';
import {
  Box,
  Check,
  CloudFog,
  Cpu,
  Droplets,
  Flame,
  Layers,
  ListOrdered,
  Ruler,
  RotateCw,
  Snowflake,
  Volume2,
  Weight,
  Wind,
  Zap,
} from 'lucide-svelte';

export type KeySpec = { name: string; value: string; icon: typeof Weight };

// Карта ключевых характеристик: на каждую категорию — приоритетный список
// ключей specs; показываем первые 4 найденных. Ключи = как в БД (products.specs).
const RULES: { match: RegExp; keys: string[] }[] = [
  {
    // стиральные / сушильные машины
    match: /стиральн|сушильн/i,
    keys: [
      'Максимальная загрузка белья',
      'Максимальная скорость отжима',
      'Тип загрузки',
      'Стирка с паром',
      'Прямой привод',
      'INVERTER',
      'Сушка',
      'Количество программ',
      'Класс энергопотребления'
    ]
  },
  {
    match: /посудомо/i,
    keys: [
      'Вместимость',
      'Количество программ',
      'Класс энергопотребления',
      'Тип установки',
      'Защита от протечек'
    ]
  },
  {
    match: /холодильник|морозильн|винный|Side-by-Side/i,
    keys: [
      'Количество камер',
      'Общий объем',
      'Объем холодильной камеры',
      'Объем морозильной камеры',
      'Размораживание холодильной камеры',
      'INVERTER'
    ]
  },
  {
    match: /духовк|духовой/i,
    keys: [
      'Тип духовки',
      'Объем',
      'Конвекция',
      'Гриль',
      'Очистка духовки',
      'Количество программ'
    ]
  },
  {
    match: /варочн|плит|поверхност/i,
    keys: [
      'Рабочая поверхность',
      'Всего конфорок',
      'Тип поверхности',
      'Мощность подключения',
      'Управление'
    ]
  },
  {
    match: /вытяжк/i,
    keys: [
      'Тип вытяжки',
      'Производительность',
      'Максимальный уровень шума',
      'Количество скоростей',
      'Управление'
    ]
  },
  {
    match: /микроволнов|свч|микроволн/i,
    keys: ['Объем', 'Управление', 'Мощность подключения', 'Внутреннее освещение']
  },
  {
    match: /мойк/i,
    keys: [
      'Материал изготовления',
      'Размер (Ширина)',
      'Глубина чаши',
      'Количество основных чаш',
      'Форма'
    ]
  },
  {
    match: /смесител|кран/i,
    keys: ['Материал изготовления', 'Форма', 'Фурнитура', 'Управление']
  },
  {
    match: /кофемашина|кофеварк|кофейн/i,
    keys: ['Объем', 'Управление', 'Мощность подключения', 'Дисплей']
  }
];

// универсальный fallback — если категория не попала в карту
const FALLBACK_KEYS = [
  'Класс энергопотребления',
  'Объем',
  'Управление',
  'Материал изготовления',
  'Страна производитель'
];

function pickIcon(key: string): typeof Weight {
  const k = key.toLowerCase();
  if (/загрузк/.test(k)) return Weight;
  if (/отжим|скорост|производительн/.test(k)) return RotateCw;
  if (/двигател|привод|inverter/.test(k)) return Cpu;
  if (/пар\b|с паром/.test(k)) return CloudFog;
  if (/программ/.test(k)) return ListOrdered;
  if (/энерг/.test(k)) return Zap;
  if (/шум/.test(k)) return Volume2;
  if (/конвекц/.test(k)) return Wind;
  if (/конфорк/.test(k)) return Flame;
  if (/объем|камер|вместимост/.test(k)) return Box;
  if (/сушк|протечк/.test(k)) return Droplets;
  if (/размораж|морозиль|no frost/.test(k)) return Snowflake;
  if (/размер|ширин|глубин|высот|чаш/.test(k)) return Ruler;
  if (/тип загрузки|тип установки|тип поверхности|тип духовки|тип вытяжки|поверхност|материал|форма/.test(k))
    return Layers;
  if (/управлен|дисплей/.test(k)) return ListOrdered;
  return Check;
}

/** До 4 ключевых характеристик товара по карте категорий (может быть меньше). */
export function getKeySpecs(p: Product): KeySpec[] {
  const specs = p.specs ?? {};
  const haystack = `${p.product_type ?? ''} ${p.name}`;
  const rule = RULES.find((r) => r.match.test(haystack));
  const keys = [...(rule?.keys ?? []), ...FALLBACK_KEYS].filter(
    (key, i, arr) => arr.indexOf(key) === i
  );
  const out: KeySpec[] = [];
  for (const key of keys) {
    const value = specs[key];
    if (value === undefined || value === null || String(value).trim() === '') continue;
    out.push({ name: key, value: String(value), icon: pickIcon(key) });
    if (out.length === 4) break;
  }
  return out;
}
