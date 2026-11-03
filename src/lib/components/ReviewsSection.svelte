<script lang="ts">
  import { ArrowUpRight, MapPin } from 'lucide-svelte';

  // Карточка организации на Яндекс Картах (та же, что была в старых отзывах)
  const YANDEX_MAPS_URL = 'https://yandex.ru/maps/org/192917903315/';
  // Карточка организации в 2ГИС (в Google Maps организации нет)
  const GIS2_URL = 'https://2gis.ru/kazan/firm/70000001103891779';
</script>

<section class="reviews mx-auto">
  <div class="reviews__head">
    <h2>Отзывы, которые<br />можно проверить</h2>
    <p>
      Выбирайте с уверенностью. Читайте отзывы о магазине на независимых площадках или делитесь
      своим опытом покупки.
    </p>
  </div>

  <div class="reviews__grid">
    <article class="platform">
      <div class="platform__top">
        <span class="platform__icon platform__icon--ya">
          <MapPin size={26} strokeWidth={2.1} color="#fc3f1d" />
        </span>
        <div class="platform__name">
          <strong>Яндекс Карты</strong>
          <span>Независимая площадка</span>
        </div>
        <ArrowUpRight class="platform__corner" size={20} strokeWidth={2} />
      </div>
      <h3>Впечатления клиентов.<br />Без лишних слов.</h3>
      <p class="platform__desc">
        Откройте карточку магазина, чтобы прочитать отзывы покупателей или рассказать о своём
        заказе.
      </p>
      <a
        class="platform__btn platform__btn--dark"
        href={YANDEX_MAPS_URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        <span>Читать отзывы на Яндекс Картах</span>
        <ArrowUpRight size={18} strokeWidth={2.1} />
      </a>
    </article>

    <article class="platform">
      <div class="platform__top">
        <span class="platform__icon platform__icon--gis2">
          <!-- официальный значок приложения 2ГИС -->
          <svg viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
            <path fill="#19AA1E" d="M0 0h18v18H0z" />
            <path fill="#FFB919" fill-rule="evenodd" d="M0 0h18v5.906L0 3.094z" clip-rule="evenodd" />
            <path fill="#82D714" fill-rule="evenodd" d="m0 16.03 18-2.812V18H0z" clip-rule="evenodd" />
            <path
              fill="#fff"
              fill-rule="evenodd"
              d="m0 2.738 6.283.982A5.05 5.05 0 0 1 9 2.953c1.39 0 2.64.52 3.55 1.435q.172.173.325.361L18 5.55v.712l-4.605-.72c.345.659.525 1.391.527 2.135 0 .964-.216 1.925-.662 2.89l-.013.03-.19.406h-.447c-.925 0-1.538.277-1.94.767-.314.384-.497.904-.558 1.47l-.002.017-.012.13-.008.077q-.035.38-.047.642L18 12.862v.712L0 16.387v-.712l7.966-1.245-.004-.16v-.044l-.002-.024v-.035a14 14 0 0 0-.054-.743l-.006-.057-.01-.099c-.056-.57-.236-1.095-.55-1.485-.397-.494-1.004-.774-1.922-.78h-.476l-.189-.406c-.455-.975-.675-1.946-.675-2.92 0-1.225.497-2.41 1.372-3.29l.076-.074L0 3.45z"
              clip-rule="evenodd"
            />
            <path
              fill="#0073FA"
              fill-rule="evenodd"
              d="M9 3.656c2.513 0 4.218 1.934 4.218 4.02 0 .838-.182 1.71-.609 2.624-2.472 0-3.082 1.77-3.198 2.885l-.008.074q-.058.597-.067.957l-.67.105v-.022q-.014-.532-.072-1.06l-.002-.02c-.107-1.113-.704-2.919-3.201-2.919-.427-.914-.61-1.786-.61-2.623C4.781 5.59 6.487 3.656 9 3.656"
              clip-rule="evenodd"
            />
          </svg>
        </span>
        <div class="platform__name">
          <strong>2ГИС</strong>
          <span>Независимая площадка</span>
        </div>
        <ArrowUpRight class="platform__corner" size={20} strokeWidth={2} />
      </div>
      <h3>Ваш опыт важен.<br />Поделитесь им.</h3>
      <p class="platform__desc">
        Посмотрите отзывы в 2ГИС. Если уже покупали у нас, будем рады вашему мнению.
      </p>
      <a
        class="platform__btn platform__btn--light"
        href={GIS2_URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        <span>Читать отзывы в 2ГИС</span>
        <ArrowUpRight size={18} strokeWidth={2.1} />
      </a>
    </article>
  </div>
</section>

<style lang="scss">
  .reviews {
    padding: $sp-4;
    border-radius: 24px;
    background: #f1f3ef;
    @media (min-width: 1024px) {
      padding: $sp-8;
    }
  }
  .reviews__head {
    display: flex;
    flex-direction: column;
    gap: $sp-3;
    @media (min-width: 1024px) {
      flex-direction: row;
      align-items: flex-start;
      justify-content: space-between;
      gap: $sp-8;
    }
    h2 {
      margin: 0;
      color: #171717;
      font-size: 1.75rem;
      line-height: 1.08;
      font-weight: 700;
      letter-spacing: -0.04em;
      @media (min-width: 1024px) {
        font-size: 2.75rem;
      }
    }
    p {
      margin: 0;
      max-width: 440px;
      color: #4b5563;
      font-size: 0.9375rem;
      line-height: 1.5;
    }
  }
  .reviews__grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: $sp-3;
    margin-top: $sp-4;
    @media (min-width: 768px) {
      grid-template-columns: 1fr 1fr;
      gap: $sp-4;
      margin-top: $sp-6;
    }
  }
  .platform {
    display: flex;
    flex-direction: column;
    gap: $sp-3;
    padding: $sp-4;
    border-radius: 20px;
    background: #fff;
    @media (min-width: 1024px) {
      padding: $sp-6;
    }
  }
  .platform__top {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .platform__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 52px;
    width: 52px;
    height: 52px;
    border: 1px solid rgba(15, 23, 42, 0.06);
    border-radius: 14px;
    background: #f8f9f7;
    &--gis2 svg {
      // цветной значок-квадрат 2ГИС: скругляем углы, как у иконки приложения
      display: block;
      width: 34px;
      height: 34px;
      border-radius: 9px;
    }
  }
  .platform__name {
    display: flex;
    flex-direction: column;
    gap: 2px;
    strong {
      color: #171717;
      font-size: 1.075rem;
      font-weight: 700;
    }
    span {
      color: #6b7280;
      font-size: 0.8125rem;
    }
  }
  .platform__corner {
    margin-left: auto;
    color: #94a3b8;
    flex-shrink: 0;
  }
  .platform h3 {
    margin: $sp-2 0 0;
    color: #171717;
    font-size: 1.375rem;
    line-height: 1.2;
    font-weight: 700;
    letter-spacing: -0.03em;
    @media (max-width: 639px) {
      font-size: 1.25rem;
    }
  }
  .platform__desc {
    margin: 0;
    max-width: 460px;
    color: #64748b;
    font-size: 0.9rem;
    line-height: 1.5;
  }
  .platform__btn {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $sp-2;
    min-height: 52px;
    margin-top: auto;
    padding: 0 20px;
    border-radius: 12px;
    font-size: 0.9375rem;
    font-weight: 500;
    text-decoration: none;
    transition:
      background 0.18s ease,
      border-color 0.18s ease,
      color 0.18s ease;
    @media (max-width: 639px) {
      padding: 0 14px;
      // подпись в одну строку на узком экране
      font-size: 0.8125rem;
    }
    span {
      text-align: left;
    }
    &--dark {
      // нейтральный чёрный как в макете (зелёных CTA на странице уже много)
      background: #171717;
      color: #fff;
      &:hover {
        background: #2d2d2d;
      }
    }
    &--light {
      border: 1px solid #e2e5e2;
      background: #fff;
      color: #171717;
      &:hover {
        border-color: rgba($green, 0.5);
        color: #{$green};
      }
    }
  }
</style>
