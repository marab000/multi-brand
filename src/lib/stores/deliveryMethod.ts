import { writable } from 'svelte/store';

/** Способ получения заказа: доставка по Казани или самовывоз (офлайн-магазин) */
export type DeliveryMethod = 'delivery' | 'pickup';

const STORAGE_KEY = 'delivery_method';

function createDeliveryMethod() {
  const { subscribe, set } = writable<DeliveryMethod>('delivery');
  if (typeof localStorage !== 'undefined') {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'delivery' || raw === 'pickup') set(raw);
  }
  return {
    subscribe,
    set: (value: DeliveryMethod) => {
      if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, value);
      set(value);
    }
  };
}

export const deliveryMethod = createDeliveryMethod();
