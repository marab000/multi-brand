import { json } from '@sveltejs/kit';
import { pickBundle, loadPodborConfig } from '$lib/server/bundlePicker';
import { SLOT_TYPES, SLOT_ORDER } from '$lib/podborSlots';
import { slugify } from '$lib/utils/slugify';

export async function POST({ request }) {
  try {
    const body = await request.json();
    const types: Record<string, boolean> = {};
    for (const slot of SLOT_ORDER) types[slot] = !!body[slot];
    if (!Object.values(types).some(Boolean)) {
      return json({ error: 'Выберите хотя бы один тип техники' }, { status: 400 });
    }
    // Уровень бюджета (тир): 1 = базовый … 4 = премиум. Бюджет суммой больше не вводится.
    const tier = Math.min(4, Math.max(1, Math.round(Number(body.tier)) || 2)) as 1 | 2 | 3 | 4;
    const brands: string[] = Array.isArray(body.brands)
      ? body.brands.filter((b: unknown) => typeof b === 'string' && b.trim()).slice(0, 20)
      : [];
    let color: string | null = typeof body.color === 'string' && body.color ? body.color : null;

    const picks = await pickBundle({ types, tier, brands, color });
    const cfg = await loadPodborConfig();
    const bonusExcludedBrands: string[] = cfg.bonusExcludedBrands ?? [];

    const result = picks.map((p) => ({
      slot: p.slot,
      label: p.label,
      // цену клиенту не отдаём: персональная цена называется менеджером после заявки
      chosen: p.chosen ? serialize(p.chosen) : null,
      alternatives: p.alternatives.map(serialize),
      fallback: !!p.fallback
    }));

    return json({
      picks: result,
      bonusExcludedBrands
    });
  } catch (err) {
    console.error('❌ /api/podbor error:', err);
    return json({ error: 'Ошибка подбора' }, { status: 500 });
  }
}

function serialize(p: any) {
  return {
    id: p.id,
    name: p.name,
    brand: p.brand?.name ?? null,
    productType: p.product_type,
    image: p.images?.[0]?.url ?? null,
    url: `/products/${slugify(p.name)}`,
    // цену в UI не показываем, но она нужна клиенту, чтобы положить комплект в корзину
    price: p.price
  };
}
