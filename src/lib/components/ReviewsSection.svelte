<script lang="ts">
  import { ArrowUpRight, Star } from 'lucide-svelte';

  // Карточка организации на Яндекс Картах (та же, что была в старых отзывах)
  const YANDEX_MAPS_URL = 'https://yandex.ru/maps/org/192917903315/';
</script>

<!-- Компактная строка рейтинга вместо двух карточек площадок: некликабельные
     рейтинги на товарах убраны, кликабельный рейтинг магазина ведёт на Яндекс -->
<section class="rating mx-auto">
  <a
    class="rating__link"
    href={YANDEX_MAPS_URL}
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Рейтинг магазина на Яндекс Картах — открыть отзывы"
  >
    <Star class="rating__star" size={22} fill="currentColor" strokeWidth={0} aria-hidden="true" />
    <b class="rating__value">4,9</b>
    <span class="rating__label">рейтинг магазина на Яндекс Картах</span>
    <ArrowUpRight class="rating__arrow" size={18} strokeWidth={2} aria-hidden="true" />
  </a>
</section>

<style lang="scss">
  .rating {
    display: flex;
    justify-content: center;
    padding: $sp-2;
  }
  .rating__link {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 12px 20px;
    border: 1px solid rgba(15, 23, 42, 0.08);
    border-radius: 999px;
    background: #fff;
    text-decoration: none;
    transition:
      box-shadow 0.18s ease,
      border-color 0.18s ease;
    &:hover {
      border-color: rgba($green, 0.25);
      box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08);
    }
  }
  .rating__star {
    color: #f0c64b;
    flex-shrink: 0;
  }
  .rating__value {
    color: #171717;
    font-size: 1.125rem;
    font-weight: 700;
    line-height: 1;
  }
  .rating__label {
    color: #4b5563;
    font-size: 0.9rem;
    @media (max-width: 639px) {
      // подпись в одну строку на узком экране
      font-size: 0.8125rem;
    }
  }
  .rating__arrow {
    color: #94a3b8;
    flex-shrink: 0;
  }
</style>
