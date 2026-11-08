// Русские названия ролей для админки; неизвестная роль выводится как есть
export const ROLE_LABELS: Record<string, string> = {
  admin: 'админ',
  designer: 'дизайнер',
  operator: 'оператор',
  seo: 'SEO',
  sales: 'продажник'
};

export const getRoleLabel = (role: string) => ROLE_LABELS[role] ?? role;
