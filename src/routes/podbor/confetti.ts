// Разовый залп конфетти при показе результата. Динамический импорт —
// пакет не грузится, пока пользователь не дошёл до финала.
export async function fireConfetti() {
  try {
    const { default: confetti } = await import('canvas-confetti');
    confetti({
      particleCount: 120,
      spread: 75,
      startVelocity: 38,
      origin: { y: 0.25 },
      colors: ['#3fae5a', '#e6a73c', '#4c9aff', '#f5c04e', '#a7d7b4'],
      disableForReducedMotion: true
    });
  } catch {
    // пакет не загрузился — просто показываем результат без конфетти
  }
}
