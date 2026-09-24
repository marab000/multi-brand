import { json } from '@sveltejs/kit';
import { sql } from '$lib/db';
import { slugify } from '$lib/utils/slugify';
import { pickBundle, displayPrice, type BundleSlotOptions } from '$lib/server/bundlePicker';

export async function POST({ request }) {
  try {
    const body = await request.json();
    const types: BundleSlotOptions = {
      hob: !!body.hob,
      oven: !!body.oven,
      hood: !!body.hood,
      dishwasher: !!body.dishwasher
    };
    if (!Object.values(types).some(Boolean)) {
      return json({ error: 'Выберите хотя бы один тип техники' }, { status: 400 });
    }
    const budget = Number(body.budget);
    if (!Number.isFinite(budget) || budget < 10000 || budget > 5000000) {
      return json({ error: 'Некорректный бюджет' }, { status: 400 });
    }
    const widthRaw = Number(body.width);
    const width = [45, 60, 90].includes(widthRaw) ? widthRaw : null;
    let color: string | null = typeof body.color === 'string' && body.color ? body.color : null;

    const picks = await pickBundle({ types, budget, width, color });

    // Скидка комплекта из настроек
    let discountEnabled = false;
    let discountPercent = 0;
    try {
      const rows = await sql`
        SELECT key, value FROM settings
        WHERE key IN ('bundle_discount_enabled', 'bundle_discount_percent')
      `;
      const map = Object.fromEntries(rows.map((r: any) => [r.key, r.value]));
      discountEnabled = map.bundle_discount_enabled === 'true';
      discountPercent = Math.min(30, Math.max(0, Number(map.bundle_discount_percent) || 0));
    } catch {
      // настройки недоступны — без скидки
    }

    const result = picks.map((p) => ({
      slot: p.slot,
      label: p.label,
      chosen: p.chosen ? serialize(p.chosen) : null,
      alternatives: p.alternatives.map(serialize)
    }));

    const totalPrice = result.reduce(
      (s, r) => s + (r.chosen ? (r.chosen.price ?? 0) : 0),
      0
    );
    const discountTotal =
      discountEnabled && discountPercent > 0
        ? Math.round((totalPrice * discountPercent) / 100)
        : 0;

    return json({
      picks: result,
      totalPrice,
      discountEnabled,
      discountPercent,
      discountTotal,
      finalPrice: totalPrice - discountTotal
    });
  } catch (err) {
    console.error('❌ /api/podbor error:', err);
    return json({ error: 'Ошибка подбора' }, { status: 500 });
  }
}

function serialize(p: any) {
  const price = displayPrice(p);
  return {
    id: p.id,
    name: p.name,
    brand: p.brand?.name ?? null,
    productType: p.product_type,
    price,
    image: p.images?.[0]?.url ?? null,
    url: `/products/${slugify(p.name)}`
  };
}
