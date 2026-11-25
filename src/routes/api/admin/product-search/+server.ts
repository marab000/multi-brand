import { json } from '@sveltejs/kit';
import { checkAdmin } from '$lib/server/adminAuth';
import { searchProducts } from '$lib/server/productRecommendations';
import type { RequestHandler } from './$types';

// GET ?q=… — общий поиск товара по названию для админских подборов
// (хиты на главной и т.д.); тот же поиск, что использует «Рекомендации»
export const GET: RequestHandler = async ({ url, cookies, locals }) => {
  await checkAdmin(cookies, locals);
  const q = url.searchParams.get('q') ?? '';
  return json({ products: await searchProducts(q) });
};
