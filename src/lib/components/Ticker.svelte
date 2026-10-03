<script lang="ts">
  // Бегущая строка поверх главной (рендерится в layout вне контейнера main)
</script>

<div class="ticker" aria-hidden="true">
  <div class="ticker__track">
    {#each [0, 1] as copy (copy)}
      <div class="ticker__group">
        <span class="ticker__item">Мы официальный партнёр брендов</span>
        <span class="ticker__dot"></span>
        <span class="ticker__item">Техника с гарантией производителя</span>
        <span class="ticker__dot"></span>
        <span class="ticker__item">Сервисная поддержка</span>
        <span class="ticker__dot"></span>
        <span class="ticker__item">Бесплатная доставка в Казани</span>
        <span class="ticker__dot"></span>
      </div>
    {/each}
  </div>
</div>

<style lang="scss">
  .ticker {
    position: relative;
    overflow: hidden;
    background: #fff;
    color: #334155;
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 13px 0;
    @media (max-width: 640px) {
      font-size: 11.5px;
      padding: 10px 0;
    }
    /* мягкий белый фейд — ширина равна расстоянию от края экрана до контента
       контейнера (max-width Tailwind-контейнера по брейкпоинтам + его паддинг),
       поэтому приглушается только текст за пределами контейнера */
    &::before,
    &::after {
      content: '';
      position: absolute;
      top: 0;
      bottom: 0;
      z-index: 1;
      pointer-events: none;
      width: max(16px, calc((100vw - 640px) / 2 + 16px));
      @media (min-width: 768px) {
        width: max(20px, calc((100vw - 768px) / 2 + 20px));
      }
      @media (min-width: 1024px) {
        width: max(24px, calc((100vw - 1024px) / 2 + 20px));
      }
      @media (min-width: 1280px) {
        width: calc((100vw - 1280px) / 2 + 20px);
      }
    }
    &::before {
      left: 0;
      background: linear-gradient(to right, #fff 12%, rgba(255, 255, 255, 0));
    }
    &::after {
      right: 0;
      background: linear-gradient(to left, #fff 12%, rgba(255, 255, 255, 0));
    }
  }
  .ticker__track {
    display: flex;
    width: max-content;
    animation: ticker-scroll 30s linear infinite;
  }
  .ticker__group {
    display: flex;
    align-items: center;
    white-space: nowrap;
  }
  .ticker__item {
    white-space: nowrap;
  }
  .ticker__dot {
    flex-shrink: 0;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: $green;
    margin: 0 22px;
    @media (max-width: 640px) {
      margin: 0 14px;
    }
  }
  @keyframes ticker-scroll {
    from {
      transform: translateX(0);
    }
    to {
      transform: translateX(-50%);
    }
  }
</style>
