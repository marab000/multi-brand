import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getSale } from '$lib/server/sale';

export const load: PageServerLoad = async ({ params }) => {
  const sale = await getSale();
  const promo = sale.promos.find((p) => p.slug === params.slug) ?? null;
  if (!promo) throw error(404, 'Акция не найдена');
  return { promo, updatedAt: sale.updatedAt };
};
