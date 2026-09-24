/**
 * Слоты викторины: типы техники (product_type) и подписи.
 * Общий модуль без серверных зависимостей — используется и в подборе, и в админке.
 */
export const SLOT_TYPES = {
  hob: [
    'Газовая поверхность',
    'Индукционная поверхность',
    'Комбинированная поверхность',
    'Электрическая поверхность',
    'Стеклокерамическая поверхность'
  ],
  oven: ['Электрический духовой шкаф', 'Газовый духовой шкаф', 'Компактный духовой шкаф'],
  hood: [
    'Вытяжка телескопическая',
    'Вытяжка в подвесной шкаф',
    'Вытяжка наклонная',
    'Вытяжка островная',
    'Вытяжка пристенная',
    'Вытяжка встраиваемая'
  ],
  dishwasher: [
    'Встраиваемая посудомоечная машина',
    'Компактная встраиваемая посудомоечная машина'
  ]
} as const;

export type PodborSlot = keyof typeof SLOT_TYPES;

export const SLOT_LABELS: Record<PodborSlot, string> = {
  hob: 'Варочная панель',
  oven: 'Духовой шкаф',
  hood: 'Вытяжка',
  dishwasher: 'Посудомоечная машина'
};

/** Слот по product_type или null, если товар не для викторины */
export function slotOfProductType(productType: string | null | undefined): PodborSlot | null {
  if (!productType) return null;
  const t = productType.trim().toLowerCase();
  for (const [slot, types] of Object.entries(SLOT_TYPES)) {
    if ((types as readonly string[]).some((s) => s.toLowerCase() === t)) {
      return slot as PodborSlot;
    }
  }
  return null;
}
