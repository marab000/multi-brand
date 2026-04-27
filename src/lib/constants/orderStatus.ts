export const ORDER_STATUS_MAP: Record<string, string> = {
  created: 'Создан',
  paid: 'Оплачен',
  shipped: 'Отправлен',
  delivered: 'Доставлен',
  cancelled: 'Отменён'
};

export const getOrderStatusLabel = (status?: string | null) => {
  if (!status) return 'Неизвестно';
  return ORDER_STATUS_MAP[status] ?? status;
};
