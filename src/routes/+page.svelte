<script lang="ts">
  import {
    ArrowRight,
    Wind,
    MapPin,
    ChevronRight
  } from 'lucide-svelte';
  import Slider from '$lib/components/Slider.svelte';
  import { cityForms } from '$lib/cityForms';
  import hob from '$lib/assets/links/hob.webp';
  import coffee from '$lib/assets/links/coffee.webp';
  import dw from '$lib/assets/links/dw.webp';
  import oven from '$lib/assets/links/oven.webp';
  import freeze from '$lib/assets/links/freeze.webp';
  import dm from '$lib/assets/links/dm.webp';
  import mw from '$lib/assets/links/mw.webp';
  import wm from '$lib/assets/links/wm.webp';
  import hood from '$lib/assets/links/hood.webp';
  import vm from '$lib/assets/links/vm.webp';
  import ProductCard from '$lib/components/ProductCard.svelte';
  import PrivilegesSection from '$lib/components/PrivilegesSection.svelte';
  import ReviewsSection from '$lib/components/ReviewsSection.svelte';
  import BrandsGrid from '$lib/components/BrandsGrid.svelte';
  import SelectionQuiz from '$lib/components/SelectionQuiz.svelte';
  import LeadRequestModal from '$lib/components/LeadRequestModal.svelte';
  import PromoOffer from '$lib/components/PromoOffer.svelte';
  import omoikiriKitchen from '$lib/assets/promo/omoikiri-kitchen.webp';
  import omoikiriFaucet from '$lib/assets/promo/omoikiri-faucet.webp';
  import omoikiriDisposer from '$lib/assets/promo/omoikiri-disposer.webp';
  import omoikiriKit from '$lib/assets/promo/omoikiri-kit.webp';
  import acSplit from '$lib/assets/promo/ac-split.webp';
  import acInvertor from '$lib/assets/promo/ac-invertor.webp';
  import acMobile from '$lib/assets/promo/ac-mobile.webp';
  import askoQuizPhoto from '$lib/assets/promo/asko-quiz.webp';
  import liebherrQuizPhoto from '$lib/assets/promo/liebherr-quiz.webp';

  // «от 48 моделей» / «от 21 модель» / «от 11 моделей» — склонение слова «модель»
  function pluralModels(n: number): string {
    const mod100 = n % 100;
    const mod10 = n % 10;
    if (mod100 >= 11 && mod100 <= 14) return 'моделей';
    if (mod10 === 1) return 'модель';
    if (mod10 >= 2 && mod10 <= 4) return 'модели';
    return 'моделей';
  }

  let { data } = $props();
  const city = $derived(cityForms(data?.city));
  const desktopImages = $derived(data.desktopSlides || []);
  const mobileImages = $derived(data.mobileSlides || []);
  // Кондиционеры: сезонный блок, вернём через полгода (true = показать)
  const AC_ENABLED = false;

  // карточка-комплект Omoikiri открывает форму заявки с предзаполненным сообщением
  let bundleOpen = $state(false);
  const bundlePrefill = [
    'Запрос на расчёт комплекта Omoikiri:',
    '— Мойка, смеситель и измельчитель в едином цвете',
    '— Выгода при покупке комплектом до 15%'
  ].join('\n');

  const categories = [
    {
      title: 'Варочные поверхности',
      link: '/catalog/vstraivaemaya-tehnika/varochnye-poverhnosti',
      img: hob
    },
    {
      title: 'Кофемашины',
      link: '/catalog/vstraivaemaya-tehnika/kofemashiny',
      img: coffee
    },
    {
      title: 'Посудомоечные машины',
      link: '/catalog/vstraivaemaya-tehnika/posudomoechnye-mashiny',
      img: dw
    },
    {
      title: 'Духовые шкафы',
      link: '/catalog/vstraivaemaya-tehnika/duhovye-shkafy',
      img: oven
    },
    {
      title: 'Стиральные машины',
      link: '/catalog/krupnaya-bytovaya-tehnika/stiralnye-i-sushilnye-mashiny/frontalnye-stiralnye-mashiny',
      img: wm
    },
    {
      title: 'Холодильники',
      link: '/catalog/krupnaya-bytovaya-tehnika/holodilniki-i-morozilniki',
      img: freeze
    },
    {
      title: 'Микроволновые печи',
      link: '/catalog/mikrovolnovye-pechi',
      img: mw
    },
    {
      title: 'Сушильные машины',
      link: '/catalog/krupnaya-bytovaya-tehnika/stiralnye-i-sushilnye-mashiny/stiralno-sushilnye-mashiny',
      img: dm
    },
    {
      title: 'Вытяжки',
      link: '/catalog/vytyazhki',
      img: hood
    },
    // винные шкафы добирают чётность сетки на мобилке (2×5); на десктопе 9 = ровно 3×3
    {
      title: 'Винные шкафы',
      link: '/catalog/krupnaya-bytovaya-tehnika/vinnye-shkafy',
      img: vm,
      mobileOnly: true
    }
  ];

  // квизы главной: контент — из демо-лендингов брендов (ASKO, Liebherr)
  const askoQuiz = {
    headingLines: ['Больше времени', 'для жизни.', 'Меньше — на быт.'],
    description:
      'Подберём стиральную и сушильную машины ASKO под ваш дом. Организуем хранение до доставки, установку и подключение.',
    needs: [
      'Стиральная + сушильная машины',
      'Только стиральная машина',
      'Только сушильная машина',
      'Нужна помощь с выбором'
    ],
    budgets: [
      'До 180 000 ₽',
      '180 000–230 000 ₽',
      '230 000–300 000 ₽',
      'Выше 300 000 ₽',
      'Пока не определился'
    ],
    installLabel: 'Как планируете установить?',
    places: ['Рядом', 'В колонну — нужна проверка', 'Пока не знаю'],
    submitLabel: 'Подобрать мой комплект',
    leadTitle: 'Запрос на подбор ASKO:',
    image: askoQuizPhoto
  };
  const liebherrQuiz = {
    headingLines: ['Хранение,', 'продуманное', 'до деталей.'],
    description:
      'Подберём холодильник или морозильную камеру Liebherr под размеры кухни, сценарий хранения и бюджет. Проверим нишу, открывание дверей, доставку и установку.',
    needs: [
      'Холодильник',
      'Морозильная камера',
      'Холодильник + морозильник',
      'Встраиваемую технику',
      'Нужна помощь с выбором'
    ],
    budgets: [
      'До 100 000 ₽',
      '100 000–180 000 ₽',
      '180 000–300 000 ₽',
      'Выше 300 000 ₽',
      'Пока не определился'
    ],
    installLabel: 'Тип установки',
    places: ['Отдельностоящая', 'Встраиваемая', 'Пока не знаю'],
    submitLabel: 'Получить подбор',
    leadTitle: 'Запрос на подбор Liebherr:',
    image: liebherrQuizPhoto,
    accentFrom: 1 // в референсе акцентом покрашены 2-я и 3-я строки («продуманное до деталей.»)
  };
  // блок-акция Liebherr (из демо-лендинга) — после ASKO-квиза
  const liebherrOffer = {
    eyebrow: 'Акция при обращении за комплектом',
    titleLines: ['Соберём решение', 'без лишних забот.'],
    text: 'Оставьте заявку — проверим размеры, сравним подходящие варианты и отдельно рассчитаем доставку, хранение и монтаж.',
    buttonLabel: 'Получить условия акции',
    leadTitle:
      'Запрос условий акции: хранение до готовности кухни, проверка ниши, доставка и установка, персональный расчёт.',
    note: 'Условия акции, период хранения и состав бесплатных или льготных работ подтверждаются магазином до оформления заказа.',
    benefits: [
      {
        title: 'Хранение до готовности кухни',
        text: 'Можно согласовать дату доставки после завершения ремонта. Срок и условия фиксируем в заказе.'
      },
      {
        title: 'Проверка ниши',
        text: 'Уточним габариты, вентиляционные зазоры, направление открывания и доступ к коммуникациям.'
      },
      {
        title: 'Доставка и установка',
        text: 'Рассчитаем работы по адресу. Подключение выполняется к подготовленным коммуникациям.'
      },
      {
        title: 'Персональный расчёт',
        text: 'Покажем состав стоимости: техника, доставка, подъём, установка и дополнительные работы.'
      }
    ]
  };
</script>

<svelte:head>
  <title
    >{data?.meta?.title ||
      `Бытовая техника в ${city.prep} — интернет-магазин Мультибренд | Рассрочка, доставка`}</title
  >
  {#if data?.meta?.canonical}<link rel="canonical" href={data.meta.canonical} />{/if}
  <meta
    name="description"
    content={data?.meta?.description ||
      `Интернет-магазин «Мультибренд» в ${city.prep}: встраиваемая и кухонная бытовая техника, вытяжки, мойки и смесители. Помощь в подборе под ваш интерьер. Доставка.`}
  />
  {#if desktopImages[0]}
    <link
      rel="preload"
      as="image"
      href={desktopImages[0]}
      media="(min-width: 1024px)"
      fetchpriority="high"
    />
  {/if}
  {#if mobileImages[0]}
    <link
      rel="preload"
      as="image"
      href={mobileImages[0]}
      media="(max-width: 1023px)"
      fetchpriority="high"
    />
  {/if}
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="MULTIBRAND" />
  <meta property="og:title" content={`Бытовая техника в ${city.prep} — интернет-магазин Мультибренд`} />
  <meta
    property="og:description"
    content={`Встраиваемая и кухонная техника от официальных поставщиков. Рассрочка 0%, бесплатная доставка по ${city.dat}, склад до 12 месяцев.`}
  />
  <meta property="og:url" content="https://multi-brand.online/" />
  {#if desktopImages[0]}
    <meta property="og:image" content={desktopImages[0]} />
    <meta property="og:image:width" content="1600" />
    <meta property="og:image:height" content="800" />
  {/if}
</svelte:head>

<!-- если все слайды скрыты — блока нет вовсе: aspect-ratio на секции держал бы пустое место -->
{#if mobileImages.length || desktopImages.length}
  <h1 class="sr-only">Бытовая техника в {city.prep} — интернет-магазин «Мультибренд»</h1>
  <section class="hero-section mx-auto mt-0! overflow-hidden rounded-2xl">
    {#if mobileImages.length}
      <div class="block lg:hidden">
        <Slider imgPaths={mobileImages} />
      </div>
    {/if}
    {#if desktopImages.length}
      <div class="hidden lg:block">
        <Slider imgPaths={desktopImages} />
      </div>
    {/if}
  </section>
{/if}

<section class="mx-auto">
  <a class="podbor-cta" href="/podbor">
    <div class="podbor-cta__main">
      <h2>
        Собери комплект техники
        <em>с помощью ИИ <span class="hidden md:inline"> за 1 минуту</span></em>
      </h2>
      <p>Ответьте на 4 вопроса — подберём комплект встраиваемой техники под ваш бюджет</p>
      <span class="podbor-cta__btn"
        >Подобрать комплект <ArrowRight size={16} strokeWidth={2.3} /></span
      >
    </div>
    <img
      class="podbor-cta__photo"
      src="/images/podbor-kitchen.png"
      alt="Кухня с встраиваемой техникой"
      loading="lazy"
    />
  </a>
</section>

<section class="mx-auto">
  <h2 class="section-title">Популярные категории</h2>
  <div class="categories-grid">
    {#each categories as c}
      <a href={c.link} class="category-card flex-col lg:flex-row" class:category-card--mobile-only={c.mobileOnly}>
        <span>{c.title}</span>
        <img src={c.img} alt="" loading="lazy" decoding="async" width="480" height="240" />
      </a>
    {/each}
  </div>
</section>

{#if data.syncBrands?.length}
  <section class="mx-auto">
    <h2 class="section-title">Бренды</h2>
    <!-- у marquee свой padding 12px (иначе тень плиток режется); отрицательными марджинами
         компенсируем его и штатные 12px секции, чтобы итоговый зазор был 12px, а не 24+ -->
    <div class="-mt-3! -mb-3!">
      <BrandsGrid brands={data.syncBrands} />
    </div>
  </section>
{/if}

<section class="mx-auto">
  <h2 class="section-title">Хиты продаж</h2>
  <div class="hits-grid">
    {#each data.hits as hit (hit.id)}
      <ProductCard product={hit} />
    {/each}
  </div>
</section>

<section class="mx-auto">
  <PrivilegesSection />
</section>

<section class="mx-auto">
  <SelectionQuiz quiz={askoQuiz} />
</section>

<section class="mx-auto">
  <PromoOffer offer={liebherrOffer} />
</section>

<section class="mx-auto">
  <!-- блок Omoikiri по референсу: шапка-лого + 3 типа карточек (тёмная фото / светлая / зелёная) -->
  <div class="omo">
    <div class="omo__head">
      <span class="omo__logo">OMOIKIRI</span>
      <span class="omo__tagline">Премиальная японская сантехника и кухонные решения</span>
    </div>

    <div class="omo__cards">
      <!-- тёмная фото-карточка: мойки (сгенерированная сцена кухни, заменит товарное фото) -->
      <a href="/catalog/kuhonnye-moyki?brand=Omoikiri" class="omo-card omo-card--photo">
        <img class="omo-card__bg" src={omoikiriKitchen} alt="Мойки Omoikiri на кухне" loading="lazy" />
        <span class="omo-card__shade"></span>
        <span class="omo-badge omo-badge--gold">Японское качество</span>
        {#if data.omoikiriCounts?.moiki}
          <span class="omo-badge">от {data.omoikiriCounts.moiki}
            {pluralModels(data.omoikiriCounts.moiki)}</span
          >
        {/if}
        <span class="omo-card__name">Кухонные мойки</span>
        <span class="omo-card__arrow"><ChevronRight size={18} strokeWidth={2.4} /></span>
      </a>

      <!-- светлая карточка: смесители (референс: светло, товар по центру) -->
      <a href="/catalog/smesiteli?brand=Omoikiri" class="omo-card omo-card--light">
        <img class="omo-card__img" src={omoikiriFaucet} alt="Смесители Omoikiri" loading="lazy" />
        <span class="omo-badge omo-badge--gold">Японское качество</span>
        {#if data.omoikiriCounts?.smesiteli}
          <span class="omo-badge">от {data.omoikiriCounts.smesiteli}
            {pluralModels(data.omoikiriCounts.smesiteli)}</span
          >
        {/if}
        <span class="omo-card__name">Смесители</span>
        <span class="omo-card__arrow omo-card__arrow--dark"
          ><ChevronRight size={18} strokeWidth={2.4} /></span
        >
      </a>

      <!-- зелёная карточка: измельчители -->
      <a
        href="/catalog/izmelchiteli-pischevyh-othodov?brand=Omoikiri"
        class="omo-card omo-card--green"
      >
        <img class="omo-card__side" src={omoikiriDisposer} alt="Измельчитель Omoikiri Nagare" loading="lazy" />
        <span class="omo-badge omo-badge--gold">Японское качество</span>
        {#if data.omoikiriCounts?.izmelchiteli}
          <span class="omo-badge">от {data.omoikiriCounts.izmelchiteli}
            {pluralModels(data.omoikiriCounts.izmelchiteli)}</span
          >
        {/if}
        <span class="omo-card__name">Измельчители отходов</span>
        <span class="omo-card__cta">В каталог <ArrowRight size={17} strokeWidth={2.3} /></span>
      </a>

      <!-- зелёная карточка-комплект: открывает форму заявки на расчёт комплекта -->
      <button
        type="button"
        class="omo-card omo-card--green omo-card--bundle"
        onclick={() => (bundleOpen = true)}
      >
        <img
          class="omo-card__side"
          src={omoikiriKit}
          alt="Комплект Omoikiri: мойка и смеситель в едином цвете"
          loading="lazy"
        />
        <span class="omo-badge omo-badge--gold">Выгода комплектом</span>
        <span class="omo-badge">до 15%</span>
        <span class="omo-card__stack">
          <span class="omo-card__sub">Мойка • смеситель • измельчитель в едином цвете</span>
          <span class="omo-card__name">Собери комплект для кухни с выгодой до 15%</span>
        </span>
        <span class="omo-card__arrow omo-card__arrow--gold"
          ><ChevronRight size={18} strokeWidth={2.4} /></span
        >
      </button>
    </div>
  </div>
</section>
<LeadRequestModal bind:open={bundleOpen} prefill={bundlePrefill} />

{#if AC_ENABLED}
  <section class="mx-auto">
    <div class="promo-banner promo-banner--ac">
      <div class="promo-banner__head">
        <div class="promo-banner__icon">
          <Wind size={26} strokeWidth={2} />
        </div>
        <div class="promo-banner__text">
          <strong>Кондиционеры</strong>
          <span
            >Сплит-системы, инверторные и мобильные кондиционеры от проверенных брендов —
            Electrolux, Ballu, Toshiba и другие.</span
          >
        </div>
      </div>
      <div class="promo-cards">
        <a
          href="/catalog/klimaticheskaya-tehnika/kondicionery/split-sistemy-on-off"
          class="promo-card"
        >
          <img class="promo-card__img" src={acSplit} alt="Сплит-система" loading="lazy" />
          <span class="promo-card__name">Сплит-системы</span>
        </a>
        <a
          href="/catalog/klimaticheskaya-tehnika/kondicionery/invertornye-split-sistemy"
          class="promo-card"
        >
          <img
            class="promo-card__img"
            src={acInvertor}
            alt="Инверторная сплит-система"
            loading="lazy"
          />
          <span class="promo-card__name">Инверторные</span>
        </a>
        <a
          href="/catalog/klimaticheskaya-tehnika/kondicionery/mobilnye-kondicionery"
          class="promo-card"
        >
          <img class="promo-card__img" src={acMobile} alt="Мобильный кондиционер" loading="lazy" />
          <span class="promo-card__name">Мобильные</span>
        </a>
      </div>
    </div>
  </section>
{/if}

<section class="mx-auto">
  <SelectionQuiz quiz={liebherrQuiz} />
</section>

<section class="mx-auto">
  <ReviewsSection />
</section>

<section class="mx-auto">
  <div class="promo-banner promo-banner--store">
    <div class="promo-banner__head">
      <div class="promo-banner__icon">
        <MapPin size={26} strokeWidth={2} color="#e6a73c" />
      </div>
      <div class="promo-banner__text">
        <strong>Приглашаем в наш офлайн-магазин кухонной техники</strong>
        <span>
          Здесь вы сможете увидеть модели вживую, сравнить бренды, проконсультироваться со
          специалистом и подобрать технику под ваши задачи.
        </span>
      </div>
    </div>
    <div class="store-info">
      <p>
        <b>Адрес:</b>
        <a
          href="https://yandex.ru/maps/?text=Казань, улица Чистопольская 66"
          target="_blank"
          rel="noopener"
          class="store-info__map-link"
        >
          Республика Татарстан, г. Казань, Ново-Савиновский район, ул. Чистопольская, д. 66 ↗
        </a>
      </p>
      <p><b>Часы работы:</b> ежедневно с 9:00 до 18:00</p>
      <p>
        <b>Личный менеджер:</b>
        <a href="tel:{data.contacts?.pavelPhoneHref ?? ''}" class="store-info__map-link"
          >{data.contacts?.pavelPhone ?? '+7 927 670-78-17'}</a
        >
        {data.contacts?.pavelName ?? 'Павел'}
      </p>
      <p>
        <b>Склад:</b>
        <a
          href="https://yandex.ru/maps/?text=Казань, Индустриальный парк M-7"
          target="_blank"
          rel="noopener"
          class="store-info__map-link"
        >
          Промышленная площадка, Индустриальный парк M-7 ↗
        </a>
      </p>
    </div>
  </div>
</section>

<section class="about-seo mx-auto">
  <div class="about-seo__inner">
    <p>
      Добро пожаловать в интернет-магазин «Мультибренд» — ваше готовое решение для комплектации
      кухни и дома современной бытовой техникой в {city.prep}. Мы собрали в одном каталоге продукцию
      ведущих мировых производителей, чтобы вы могли легко подобрать технику под любой интерьер,
      кухонный проект или готовый дизайн.
    </p>
    <p>
      В нашем ассортименте представлена как крупная, так и мелкая бытовая техника, встраиваемые
      духовые шкафы и варочные панели, современные кухонные вытяжки и климатические системы для
      создания идеального микроклимата.
    </p>
    <p>
      Мы уделяем особое внимание деталям, поэтому у нас вы найдете большой выбор кухонных моек,
      смесителей, измельчителей пищевых отходов (диспоузеров) и оригинальных запчастей к ним. Также
      мы поставляем профессиональную технику для бизнеса.
    </p>

    <h3>Почему выбирают «Мультибренд»?</h3>
    <ul>
      <li>
        <strong>Индивидуальный подбор:</strong> Поможем подобрать технику под ваши задачи. Подскажем по
        точным размерам, брендам, цветам, совместимости и комплектации.
      </li>
      <li>
        <strong>Шоурум в Казани:</strong> Вы можете оформить быструю доставку на сайте или посетить наш
        офлайн-магазин в Казани, чтобы вживую оценить качество товаров.
      </li>
      <li>
        <strong>Официальная гарантия:</strong> Работаем только с проверенными брендами и гарантируем высокое
        качество каждого прибора.
      </li>
    </ul>
    <p>
      Оставьте заявку на сайте или свяжитесь с нами в Макс — эксперты «Мультибренд» помогут сделать
      вашу кухню функциональной, стильной и уютной!
    </p>
  </div>
</section>

<style lang="scss">
  // референс: белая карточка, слева текст + жёлтая кнопка + 3 преимущества,
  // справа фото кухни (статичный ассет со стикером)
  .podbor-cta {
    position: relative;
    display: flex;
    align-items: stretch;
    padding: 16px 36% 16px 24px;
    border-radius: 16px;
    overflow: hidden;
    background: #fff;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
    color: #2e3d2f;
    text-decoration: none;
    transition:
      transform 0.15s ease,
      box-shadow 0.15s ease;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
      .podbor-cta__btn :global(svg) {
        transform: translateX(3px);
      }
    }

    &__main {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }

    &__main h2 {
      margin: 8px 0 0;
      font-size: clamp(20px, 1.9vw, 26px);
      font-weight: 700;
      color: #2e3d2f;
      line-height: 1.15;

      em {
        // inline-block: «с помощью ИИ» переносится только целиком,
        // предлог «с» не отрывается от фразы
        display: inline-block;
        font-style: normal;
        color: #2f6b3a;
        // жёлтый маркер-подчёркивание как в референсе
        background: linear-gradient(transparent 68%, rgba(240, 198, 75, 0.7) 68%);
        padding: 0 4px;
      }
    }

    &__main p {
      margin: 8px 0 12px;
      max-width: 480px;
      font-size: 0.8125rem;
      line-height: 1.45;
      color: #7d8a7e;
    }

    &__btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 24px;
      border-radius: 999px;
      background: #f0c64b;
      color: #2e3d2f;
      font-size: 0.875rem;
      font-weight: 700;
      box-shadow: 0 4px 10px rgba(240, 198, 75, 0.45);
      :global(svg) {
        transition: transform 0.15s ease;
      }
    }

    &__features {
      list-style: none;
      display: flex;
      flex-wrap: wrap;
      gap: 8px 20px;
      margin: 12px 0 0;
      padding: 0;

      li {
        display: flex;
        align-items: center;
        gap: 8px;

        :global(svg) {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: #e4eee4;
          color: #2f6b3a;
          padding: 8px;
          box-sizing: border-box;
        }
        span {
          display: flex;
          flex-direction: column;
          line-height: 1.25;
        }
        b {
          font-size: 0.8125rem;
          font-weight: 700;
          color: #2e3d2f;
        }
        i {
          font-style: normal;
          font-size: 0.8125rem;
          color: #8a978b;
        }
      }
    }

    // фото кухни справа: вплотную к верхнему/правому/нижнему краю карточки,
    // левый edge плавно растворяется в белом фоне
    &__photo {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      height: 100%;
      width: 40%;
      max-width: 480px;
      object-fit: cover;
      border-radius: 0 16px 16px 0;
      mask-image: linear-gradient(to right, transparent 0, #000 110px);
      -webkit-mask-image: linear-gradient(to right, transparent 0, #000 110px);

      @media (max-width: 860px) {
        // фото не прячем — сжимаем и усиливаем левый фейд, чтобы текст читался
        display: block;
        width: 46%;
        mask-image: linear-gradient(to right, transparent 0, #000 55px);
        -webkit-mask-image: linear-gradient(to right, transparent 0, #000 55px);
      }
    }

    @media (max-width: 860px) {
      padding: 16px 44% 16px 16px;
      &__main {
        align-items: flex-start;
        text-align: left;
      }
      &__main p {
        max-width: none;
      }
      &__features {
        justify-content: flex-start;
        gap: $sp-1 14px;
        li {
          flex-direction: row;
          text-align: left;
          :global(svg) {
            width: 28px;
            height: 28px;
            padding: 6px;
          }
        }
      }
      &__btn {
        padding: 10px 18px;
        font-size: 0.8125rem;
      }
    }

    @media (max-width: 640px) {
      // на 350px фото заходит ПОД текст с длинным левым фейдом:
      // блок не растёт по высоте, текст читается поверх растворённой части
      padding: 16px 12% 16px 16px;

      &__main {
        position: relative;
        z-index: 1;
      }

      &__photo {
        width: 52%;
        mask-image: linear-gradient(to right, transparent 0, #000 70%);
        -webkit-mask-image: linear-gradient(to right, transparent 0, #000 70%);
      }
    }
  }
  .hits-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    @media (min-width: 1280px) {
      grid-template-columns: repeat(5, 1fr);
    }
    // на узких экранах показываем только 6 хитов, десятый десяток не нужен
    @media (max-width: 1024px) {
      grid-template-columns: repeat(2, 1fr);
      > :global(:nth-child(n + 7)) {
        display: none;
      }
    }
    @media (max-width: 560px) {
      grid-template-columns: 1fr;
    }
  }
  .store-info {
    padding: 0 20px 20px;
    display: grid;
    gap: 8px;
    p {
      margin: 0;
      font-size: 0.875rem;
      line-height: 1.5;
      color: #374151;
      b {
        color: #111827;
      }
    }
    &__map-link {
      color: $green;
      font-weight: 600;
      text-decoration: underline;
      text-underline-offset: 2px;
    }
  }
  .hero-section {
    margin-top: 0;

    /* УЗКИЙ баннер (утверждено, п.18 «Размер баннера большой слишком»).
       Пропорции зафиксированы — высота НЕ зависит от размера окна:
       мобилка 2:1 (слайды 800x400), десктоп 4:1 (формат слайдов 1600x400).
       Высота на десктопе ≈ 310px при любой ширине — как в утверждённой версии.
       CLS = 0. */
    aspect-ratio: 2 / 1;
    @media (min-width: 1024px) {
      aspect-ratio: 4 / 1;
    }

    :global(img) {
      object-fit: cover;
      width: 100%;
      height: 100%;
    }
  }
  .section-title {
    margin: 0 0 10px;
    font-size: 1.25rem;
    font-weight: 700;
    line-height: 1.15;
    color: #111827;
  }
  .articles-home__head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    .section-title {
      margin-bottom: 0;
    }
  }
  .articles-home__all {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 0.875rem;
    font-weight: 700;
    color: $green;
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  }
  .articles-home__grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
    margin-top: 16px;
    @media (min-width: 640px) {
      grid-template-columns: repeat(3, 1fr);
    }
  }
  .articles-home__card {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid rgba(15, 23, 42, 0.07);
    border-radius: 16px;
    background: #fff;
    text-decoration: none;
    color: inherit;
    transition:
      transform 0.2s ease,
      box-shadow 0.2s ease;
    &:hover {
      transform: translateY(-3px);
      box-shadow: 0 12px 28px rgba(0, 0, 0, 0.08);
      h3 {
        color: $green;
      }
    }
  }
  .articles-home__cover {
    height: 160px;
    background: #f8f9fa;
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .no-cover {
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, rgba($green, 0.08), rgba($yellow, 0.1));
    }
  }
  .articles-home__body {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 16px 16px 20px;
    h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
      line-height: 1.3;
      color: #111827;
      display: -webkit-box;
      overflow: hidden;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      -webkit-box-orient: vertical;
      transition: color 0.15s;
    }
    p {
      margin: 0;
      font-size: 0.86rem;
      line-height: 1.5;
      color: #667085;
      display: -webkit-box;
      overflow: hidden;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      -webkit-box-orient: vertical;
    }
  }
  .categories-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }
  @media (max-width: 640px) {
    // на узких экранах названия («Посудомоечные машины») в 3 колонки не влезают
    // даже мелким шрифтом — на мобилке 2 колонки, 3 остаются от 640px
    .categories-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  .category-card {
    display: flex;
    // направление (колонка → ряд от lg) задаётся tailwind-классами flex-col lg:flex-row
    align-items: stretch;
    gap: 8px;
    padding: 12px;
    overflow: hidden;
    border: 1px solid rgba(15, 23, 42, 0.08);
    border-radius: 16px;
    background: #fff;
    color: #111827;
    box-shadow: 0 8px 22px rgba(15, 23, 42, 0.06);
    transition:
      transform 0.2s ease,
      border-color 0.2s ease,
      box-shadow 0.2s ease;
    // мобильная категория добирает чётность сетки, на десктопе не показывается
    &--mobile-only {
      @media (min-width: 641px) {
        display: none;
      }
    }
    span {
      order: 2;
      font-size: 0.8125rem;
      font-weight: 600;
      line-height: 1.25;
    }
    img {
      order: 1;
      width: 100%;
      height: auto;
      aspect-ratio: 480 / 240;
      object-fit: cover;
      border-radius: 8px;
    }
    &:hover {
      transform: translateY(-2px);
      border-color: rgba($green, 0.22);
      box-shadow: 0 14px 28px rgba(15, 23, 42, 0.1);
    }
  }
  .kit-card {
    position: relative;
    display: flex;
    flex-direction: column;
    min-height: 360px;
    overflow: hidden;
    border: 1px solid rgba(62, 111, 79, 0.12);
    border-radius: 16px;
    background: #fff;
    color: #111827;
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
    transition:
      transform 0.22s ease,
      border-color 0.22s ease,
      box-shadow 0.22s ease;
    &:hover {
      transform: translateY(-4px);
      border-color: rgba(62, 111, 79, 0.26);
      box-shadow: 0 18px 40px rgba(15, 23, 42, 0.12);
      .kit-card__image img {
        transform: scale(1.04);
      }
      .kit-card__content em svg {
        transform: translateX(3px);
      }
    }
  }
  .kit-card__badge {
    position: absolute;
    top: 12px;
    right: 12px;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: 999px;
    background: var(--kit-color);
    color: #fff;
    font-size: 1rem;
    font-weight: 700;
    box-shadow: 0 10px 20px rgba(62, 111, 79, 0.22);
  }
  .kit-card__image {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 188px;
    padding: 28px 20px 12px;
    background: radial-gradient(circle at 50% 66%, rgba(62, 111, 79, 0.1), transparent 38%), #fff;
    img {
      width: 100%;
      max-width: 225px;
      height: 100%;
      object-fit: contain;
      filter: drop-shadow(0 14px 18px rgba(15, 23, 42, 0.14));
      transition: transform 0.22s ease;
    }
  }
  .kit-card__content {
    display: flex;
    flex: 1;
    flex-direction: column;
    padding: 0 20px 20px;
    text-align: center;
    strong {
      max-width: 96%;
      margin: 0 auto;
      font-size: 1rem;
      font-weight: 700;
      line-height: 1.22;
      color: #111827;
    }
    span {
      max-width: 92%;
      margin: 12px auto 0;
      font-size: 0.88rem;
      line-height: 1.38;
      color: #64748b;
    }
    em {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      height: 52px;
      margin: auto -20px -20px;
      background: var(--kit-color);
      color: #fff;
      font-size: 0.88rem;
      font-style: normal;
      font-weight: 700;
      svg {
        flex: 0 0 auto;
        transition: transform 0.2s ease;
      }
    }
  }
  // ─── Promo banners (Omoikiri / AC) ───
  .promo-banner {
    display: flex;
    flex-direction: column;
    gap: $sp-4;
    padding: 24px;
    border-radius: 16px;
    box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
  }
  .promo-banner--ac {
    border: 1px solid rgba(59, 130, 246, 0.12);
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.06), rgba(59, 130, 246, 0.02));
  }
  .promo-banner__head {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .promo-banner__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 56px;
    height: 56px;
    border-radius: 16px;
    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
  }
  .promo-banner--store .promo-banner__head {
    /* текст слева, иконка справа (по просьбе — блок не должен центрироваться) */
    justify-content: flex-start;
    text-align: left;
    .promo-banner__icon {
      order: 2;
      margin-left: auto;
    }
  }
  .promo-banner--ac .promo-banner__icon {
    background: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
  }
  .promo-banner__text {
    display: flex;
    flex-direction: column;
    gap: 4px;
    strong {
      font-size: 1.125rem;
      font-weight: 700;
      line-height: 1.2;
      color: #111827;
    }
    span {
      font-size: 0.92rem;
      line-height: 1.4;
      color: #475569;
    }
  }
  // ─── Promo cards ───
  .promo-cards {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
  }
  .promo-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 16px;
    border: 1px solid #e8e8ec;
    border-radius: 16px;
    background: #fff;
    color: #111827;
    text-decoration: none;
    transition:
      transform 0.2s ease,
      border-color 0.2s ease,
      box-shadow 0.2s ease;
    &:hover {
      transform: translateY(-3px);
      box-shadow: 0 12px 28px rgba(15, 23, 42, 0.12);
      .promo-card__img {
        transform: scale(1.03);
      }
    }
  }
  .promo-banner--ac .promo-card:hover {
    border-color: rgba(59, 130, 246, 0.3);
  }
  .promo-card__img {
    /* единый квадратный слот, вписываем без обрезки */
    width: 150px;
    height: 150px;
    object-fit: contain;
    border-radius: 12px;
    background: #fff;
    transition: transform 0.22s ease;
    @media (max-width: 639px) {
      width: 118px;
      height: 118px;
    }
    /* у товарных фото из каталога нет белых полей, в отличие от промо-графики —
       добавляем внутренний отступ, чтобы товары не выглядели крупнее */
    &--catalog {
      padding: 24px;
      @media (max-width: 639px) {
        padding: 16px;
      }
    }
  }
  .promo-card__name {
    font-size: 0.95rem;
    font-weight: 700;
    text-align: center;
    color: #111827;
  }
  // ─── Блок Omoikiri по референсу: шапка-лого + 3 типа карточек ───
  .omo {
    display: flex;
    flex-direction: column;
    gap: $sp-4;
    @media (min-width: 1024px) {
      gap: $sp-6;
    }
  }
  .omo__head {
    display: flex;
    flex-direction: column;
    gap: $sp-1;
  }
  .omo__logo {
    color: #1c2b22;
    font-size: 1.75rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    line-height: 1;
    @media (min-width: 1024px) {
      font-size: 2.5rem;
    }
  }
  .omo__tagline {
    color: #475569;
    font-size: 0.9375rem;
    line-height: 1.4;
  }
  // «металлик» золота без картинки: диагональный градиент со световыми бликами
  $omo-gold: linear-gradient(105deg, #f7e2a0 0%, #eec86a 26%, #d4a638 52%, #f2d67e 76%, #cfa236 100%);
  .omo__cards {
    display: grid;
    grid-template-columns: 1fr;
    gap: $sp-3;
    @media (min-width: 768px) {
      // 2×2: четвёртая карточка (комплект на /podbor) добирает вторую строку;
      // 1fr на строки — все карточки одной высоты
      grid-template-columns: repeat(2, 1fr);
      grid-auto-rows: 1fr;
      gap: $sp-4;
      .omo-card {
        // компактная высота на десктопе (мобилка — 230px из базы)
        min-height: 168px;
      }
    }
  }
  .omo-card {
    position: relative;
    display: flex;
    min-height: 230px;
    overflow: hidden;
    border-radius: 18px;
    isolation: isolate;
    text-decoration: none;
    transition:
      transform 0.2s ease,
      box-shadow 0.2s ease;
    &:hover {
      transform: translateY(-3px);
      box-shadow: 0 14px 30px rgba(15, 23, 42, 0.14);
    }
    // бейджи поверх карточки: золотая пилюля + белая с количеством
    .omo-badge {
      position: absolute;
      top: 14px;
      z-index: 2;
      padding: 6px 12px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.92);
      color: #1c2b22;
      font-size: 0.75rem;
      font-weight: 700;
      &--gold {
        left: 14px;
        border: 1px solid rgba(146, 108, 22, 0.45);
        background: $omo-gold;
        color: #4a3a10;
      }
    }
    .omo-badge + .omo-badge {
      left: auto;
      right: 14px;
    }
    .omo-card__name {
      position: absolute;
      bottom: 18px;
      left: 18px;
      z-index: 2;
      max-width: 70%;
      color: #1c2b22;
      font-size: 1.375rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      line-height: 1.15;
    }
    .omo-card__arrow {
      position: absolute;
      bottom: 14px;
      right: 14px;
      z-index: 2;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #fff;
      color: #1c2b22;
      box-shadow: 0 6px 16px rgba(15, 23, 42, 0.18);
      &--dark {
        background: #1c2b22;
        color: #fff;
        box-shadow: none;
      }
      &--gold {
        background: $omo-gold;
        color: #4a3a10;
        box-shadow: none;
      }
    }
  }
  .omo-card--photo {
    background: #20272a;
    .omo-card__bg {
      position: absolute;
      inset: 0;
      z-index: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    // затемнение снизу — чтобы белое название читалось поверх светлого фото
    .omo-card__shade {
      position: absolute;
      inset: 0;
      z-index: 1;
      background: linear-gradient(to top, rgba(10, 16, 14, 0.72) 0%, rgba(10, 16, 14, 0) 55%);
    }
    .omo-card__name {
      color: #fff;
    }
  }
  .omo-card--light {
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(15, 23, 42, 0.07);
    background: #f6f7f5;
    .omo-card__img {
      // фикс. высота: иначе tall-фото раздувает строку сетки
      height: 140px;
      width: auto;
      max-width: 80%;
      object-fit: contain;
      // фон фото прозрачный (PNG с альфой) — никакие бленды не нужны
    }
  }
  .omo-card--green {
    // референс: тёмный лес слева → светлый изумруд справа + свечение за диспоузером
    background:
      radial-gradient(ellipse 45% 75% at 72% 55%, rgba(14, 110, 66, 0.55), transparent 72%),
      linear-gradient(100deg, #04301b 0%, #034828 100%);
    min-height: 190px;
    .omo-card__side {
      // вырезанный товар (фон удалён, PNG с альфой) прямо на зелёной заливке.
      // height обязателен явно: img — replaced-элемент, при width+% + height:auto
      // браузер берёт высоту из аспекта файла и выносит бокс за карточку
      position: absolute;
      top: 14px;
      right: 14px;
      height: calc(100% - 28px);
      width: 34%;
      object-fit: contain;
      filter: drop-shadow(0 14px 22px rgba(0, 0, 0, 0.28));
    }
    .omo-card__name {
      position: absolute;
      top: 58px;
      bottom: auto;
      left: 18px;
      max-width: 52%;
      color: #fff;
      font-size: 1.4rem;
      line-height: 1.2;
    }
    .omo-card__cta {
      position: absolute;
      bottom: 18px;
      left: 18px;
      z-index: 2;
      display: inline-flex;
      align-items: center;
      gap: $sp-2;
      color: #fff;
      font-size: 0.9375rem;
      font-weight: 700;
    }
    // карточка-комплект (референс): заголовок + золотой подзаголовок стеком, мойка справа.
    // это <button> (открывает форму заявки) — сбрасываем кнопочные дефолты под карточку
    &.omo-card--bundle {
      appearance: none;
      width: 100%;
      padding: 0;
      border: 0;
      cursor: pointer;
      font: inherit;
      text-align: left;
      .omo-card__side {
        width: 40%;
        pointer-events: none;
      }
      .omo-card__stack {
        position: absolute;
        bottom: 18px;
        left: 18px;
        z-index: 2;
        display: flex;
        flex-direction: column;
        gap: $sp-3;
        max-width: 55%;
        .omo-card__name {
          position: static;
          max-width: none;
          font-size: 1.1rem;
        }
        .omo-card__sub {
          color: #b0aa7d;
          font-size: 0.75rem;
          font-weight: 600;
          line-height: 1.35;
        }
      }
    }
  }
  @media (max-width: 639px) {
    .omo-card .omo-card__name {
      font-size: 1.15rem;
      max-width: 60%;
    }
    .omo-card--green .omo-card__name {
      font-size: 1.25rem;
    }
    // на мобилке карточка 230px — стек шире, шрифт заголовка меньше
    // (специфичность — как у базовых правил стека, чтобы переиграть их)
    .omo-card--green.omo-card--bundle .omo-card__stack {
      max-width: 60%;
      .omo-card__name {
        font-size: 1.05rem;
      }
    }
  }
  section {
    margin-top: 12px;
    margin-bottom: 12px;
  }
  /* первая секция прижата к верху страницы, отступ снизу предыдущего блока её раздувает */
  section:first-child {
    margin-top: 0;
  }
  @media (min-width: 640px) {
    .categories-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    .promo-cards {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  // горизонтальная карточка только от lg (tailwind lg:flex-row): 640–1024 остаются колонкой и не режутся
  @media (min-width: 1024px) {
    .category-card {
      align-items: center;
      gap: 0;
      min-height: 108px;
      // слева 0: картинка прижата к краю карточки
      padding: 16px 16px 16px 0;
      span {
        order: 2;
        font-size: 1.02rem;
      }
      img {
        flex: 0 0 104px;
        width: 104px;
        height: 78px;
        object-fit: contain;
        border-radius: 0;
      }
    }
  }
  @media (max-width: 639px) {
    .section-title {
      margin-bottom: 16px;
      font-size: 1.45rem;
    }
    .promo-banner {
      padding: 20px;
      border-radius: 16px;
    }
    .promo-banner__head {
      justify-content: center;
    }
    .promo-banner__icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
    }
    .promo-banner__text {
      align-items: center;
      text-align: center;
      strong {
        font-size: 1.2rem;
      }
    }
    .promo-card__img {
      width: 118px;
      height: 118px;
    }
    .kit-card {
      min-height: 330px;
    }
    .kit-card__image {
      height: 170px;
      padding-top: 24px;
    }
  }
  @media (min-width: 1024px) {
    .categories-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    .promo-banner--ac .promo-cards {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }
  .about-seo {
    margin: 0 0 24px;
    &__inner {
      padding: 28px;
      border: 1px solid rgba(15, 23, 42, 0.08);
      border-radius: 16px;
      background: #fff;
    }
    h2 {
      margin: 0 0 16px;
      font-size: 1.6rem;
      font-weight: 700;
      line-height: 1.2;
      color: #111827;
    }
    h3 {
      margin: 24px 0 12px;
      font-size: 1.125rem;
      font-weight: 700;
      color: #111827;
    }
    p {
      margin: 0 0 12px;
      font-size: 0.95rem;
      line-height: 1.6;
      color: #475569;
    }
    ul {
      margin: 0;
      padding: 0;
      list-style: none;
      li {
        position: relative;
        padding-left: 24px;
        margin-bottom: 12px;
        font-size: 0.95rem;
        line-height: 1.6;
        color: #475569;
        &::before {
          content: '';
          position: absolute;
          top: 9px;
          left: 0;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: $green;
        }
      }
    }
  }
</style>
