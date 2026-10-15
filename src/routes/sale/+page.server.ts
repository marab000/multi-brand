import type { PageServerLoad } from './$types';
import { getSale } from '$lib/server/sale';

export const load: PageServerLoad = async () => {
	return { sale: await getSale() };
};
