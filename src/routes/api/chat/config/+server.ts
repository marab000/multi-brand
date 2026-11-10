import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getChatConfig } from '$lib/server/chatConfig';

// Публичный конфиг виджета: только то, что нужно клиенту.
// notifyEmail и прочее служебное наружу не отдаём.
export const GET: RequestHandler = async () => {
  const c = await getChatConfig();
  return json({
    enabled: c.enabled,
    operatorName: c.operatorName,
    operatorRole: c.operatorRole,
    workFrom: c.workFrom,
    workTo: c.workTo,
    offlineText: c.offlineText,
    welcomeText: c.welcomeText,
    autoConfirm: c.autoConfirm,
    chips: c.chips,
    teaserEnabled: c.teaserEnabled,
    teaserDelaySec: c.teaserDelaySec,
    teaserPhrase: c.teaserPhrase,
    maxLen: c.maxLen
  });
};
