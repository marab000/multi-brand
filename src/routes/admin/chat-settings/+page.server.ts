import type { PageServerLoad, Actions } from './$types';
import { getChatConfig, saveChatConfig, DEFAULT_CHAT_CONFIG } from '$lib/server/chatConfig';
import type { ChatConfig } from '$lib/server/chatConfig';

export const load: PageServerLoad = async () => {
  const config = await getChatConfig();
  return { config };
};

const num = (fd: FormData, key: string, fallback: number) => {
  const n = Number(fd.get(key));
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export const actions: Actions = {
  save: async ({ request }) => {
    const fd = await request.formData();
    const current = await getChatConfig();

    // чипы приходят парами label[i] / text[i]
    const labels = fd.getAll('chipLabel').map(String);
    const texts = fd.getAll('chipText').map(String);
    const chips: { label: string; text: string }[] = [];
    labels.forEach((label, i) => {
      const text = texts[i] ?? '';
      if (label.trim() && text.trim()) chips.push({ label: label.trim(), text: text.trim() });
    });

    const config: ChatConfig = {
      enabled: fd.get('enabled') === 'on',
      operatorName: String(fd.get('operatorName') ?? current.operatorName).trim() || current.operatorName,
      operatorRole: String(fd.get('operatorRole') ?? current.operatorRole).trim(),
      workFrom: Math.min(23, Math.max(0, num(fd, 'workFrom', current.workFrom))),
      workTo: Math.min(24, Math.max(1, num(fd, 'workTo', current.workTo))),
      offlineText: String(fd.get('offlineText') ?? '').trim() || current.offlineText,
      welcomeText: String(fd.get('welcomeText') ?? '').trim() || current.welcomeText,
      autoConfirm: String(fd.get('autoConfirm') ?? '').trim() || current.autoConfirm,
      chips: chips.length ? chips : current.chips,
      teaserEnabled: fd.get('teaserEnabled') === 'on',
      teaserDelaySec: num(fd, 'teaserDelaySec', current.teaserDelaySec),
      teaserPhrase: String(fd.get('teaserPhrase') ?? '').trim() || current.teaserPhrase,
      // «Уведомления и лимиты» из админки убраны: почта выключена,
      // лимит длины и автозакрытие зашиты константами
      notifyEmail: '',
      maxLen: DEFAULT_CHAT_CONFIG.maxLen,
      autoCloseHours: DEFAULT_CHAT_CONFIG.autoCloseHours
    };

    await saveChatConfig(config);
    return { saved: true };
  }
};

// дефолты нужны форме для ресета — не экспортирую наружу, только в load

