import type { PageServerLoad } from './$types';

// Доступ закрывает /admin/+layout.server.ts (роль admin); страница целиком
// живёт на клиенте через /api/admin/recommendations
export const load: PageServerLoad = async () => {
  return {};
};
