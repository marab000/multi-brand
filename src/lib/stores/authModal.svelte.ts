// Открытие модалки авторизации из любого компонента (корзина и т.д.).
// Экземпляр AuthModal живёт в Header — communicates через window-событие.
export function openAuthModal(mode: 'login' | 'register' = 'login') {
  window.dispatchEvent(new CustomEvent('open-auth-modal', { detail: { mode } }));
}
