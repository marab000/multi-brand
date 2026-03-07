import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
const res = await fetch('/api/brands');
const brands = res.ok ? await res.json() : [];
return { brands };
};