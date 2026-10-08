import { json } from '@sveltejs/kit';
import { checkAdmin } from '$lib/server/adminAuth';
import { getImagesSyncStateView } from '$lib/server/tetrasisImages';
import type { RequestHandler } from './$types';

// GET — статус прогона картинок (поллинг карточки в админке)
export const GET: RequestHandler = async ({ cookies, locals }) => {
	await checkAdmin(cookies, locals);
	return json(await getImagesSyncStateView());
};
