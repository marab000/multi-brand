// Общая логика «скролл вниз — панель прячется, вверх — возвращается» для
// верхней шапки и нижней панели. Один слушатель на обе: прячутся и показываются
// синхронно, поэтому им не за что конфликтовать (порог и направление одни).
export const scrollUi = $state({
  headerHidden: false,
  bottomNavHidden: false,
  // страница прокручена от верха — липкой шапке включается тень
  scrolled: false
});

let started = false;
export function initScrollDirection() {
  if (started || typeof window === 'undefined') return;
  started = true;
  let lastY = window.scrollY;
  window.addEventListener(
    'scroll',
    () => {
      const y = window.scrollY;
      const delta = y - lastY;
      if (y < 120) {
        scrollUi.headerHidden = false;
        scrollUi.bottomNavHidden = false;
      } else if (delta > 6) {
        scrollUi.headerHidden = true;
        scrollUi.bottomNavHidden = true;
      } else if (delta < -6) {
        scrollUi.headerHidden = false;
        scrollUi.bottomNavHidden = false;
      }
      scrollUi.scrolled = y > 60;
      lastY = y;
    },
    { passive: true }
  );
}
