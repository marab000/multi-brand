import { getHealthStatus } from '$lib/server/healthCheck';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  return { health: await getHealthStatus() };
};
