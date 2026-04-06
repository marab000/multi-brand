import type { LayoutServerLoad } from './$types';
import { getTypeGroups } from '$lib/server/getTypeGroups';

export const load: LayoutServerLoad = async () => {
  return {
    typeGroups: await getTypeGroups()
  };
};