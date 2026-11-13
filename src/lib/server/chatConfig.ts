// Настройки чата: единый источник правды — settings.chat_config (JSON).
// Дефолты здесь; админка /admin/chat-settings редактирует через saveChatConfig.
import { sql } from '$lib/db';
import { COMPANY_EMAIL } from '$lib/config/site';

export type ChatChip = { label: string; text: string };

export type ChatConfig = {
  enabled: boolean;
  operatorName: string;
  operatorRole: string;
  workFrom: number;
  workTo: number;
  offlineText: string;
  welcomeText: string;
  autoConfirm: string;
  chips: ChatChip[];
  teaserEnabled: boolean;
  teaserDelaySec: number;
  teaserPhrase: string;
  notifyEmail: string;
  maxLen: number;
  // автозакрытие неактивных диалогов: часов без сообщений, 0 = выкл
  autoCloseHours: number;
};

export const DEFAULT_CHAT_CONFIG: ChatConfig = {
  enabled: true,
  operatorName: 'Павел',
  operatorRole: 'эксперт Multi-Brand',
  workFrom: 9,
  workTo: 18,
  offlineText: 'Мы офлайн — оставьте сообщение, ответим утром.',
  welcomeText:
    'Здравствуйте! Подбираете технику под готовую кухню или проект в ремонте?',
  autoConfirm: 'Принял! Передал Павлу — ответит в течение пары минут.',
  chips: [
    { label: 'Собрать комплект со скидкой', text: 'Собрать комплект техники со скидкой' },
    { label: 'Проверить размеры ниши кухни', text: 'Проверить размеры ниши и схему встройки' },
    { label: 'Хранение до конца ремонта', text: 'Как работает хранение до конца ремонта?' },
    { label: 'Рассрочка 0% на 12 месяцев', text: 'Условия рассрочки 0% без переплат' }
  ],
  teaserEnabled: true,
  teaserDelaySec: 8,
  teaserPhrase: 'Помочь проверить размеры ниши или собрать комплект со скидкой?',
  notifyEmail: COMPANY_EMAIL,
  maxLen: 2000,
  autoCloseHours: 24
};

export async function getChatConfig(): Promise<ChatConfig> {
  try {
    const rows = await sql`SELECT value FROM settings WHERE key = 'chat_config'`;
    if (rows.length) {
      return {
        ...DEFAULT_CHAT_CONFIG,
        ...JSON.parse(rows[0].value),
        // зашито, в админке не редактируется: письма-уведомления выключены,
        // лимит длины сообщения и автозакрытие — константы
        notifyEmail: '',
        maxLen: DEFAULT_CHAT_CONFIG.maxLen,
        autoCloseHours: DEFAULT_CHAT_CONFIG.autoCloseHours
      };
    }
  } catch {
    // settings/chat_config ещё нет — работаем на дефолтах
  }
  return DEFAULT_CHAT_CONFIG;
}

export async function saveChatConfig(config: ChatConfig): Promise<void> {
  await sql`
    INSERT INTO settings (key, value) VALUES ('chat_config', ${JSON.stringify(config)})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  `;
}
