import type { PageServerLoad } from './$types';

// Гвард — в admin/+layout.server.ts (admin или operator).
export const load: PageServerLoad = async ({ parent }) => {
  const { user } = await parent();
  return { user };
};
