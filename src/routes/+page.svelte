<script lang="ts">
  import {
    ArrowRight,
    ArrowUpRight,
    ChevronDown,
    Wind,
    ChevronRight,
    Headset,
    ShieldCheck,
    Wrench
  } from 'lucide-svelte';
  import Slider from '$lib/components/Slider.svelte';
  import { cityForms } from '$lib/cityForms';
  import hob from '$lib/assets/links/hob.webp';
  import dw from '$lib/assets/links/dw.webp';
  import oven from '$lib/assets/links/oven.webp';
  import freeze from '$lib/assets/links/freeze.webp';
  import dm from '$lib/assets/links/dm.webp';
  import mw from '$lib/assets/links/mw.webp';
  import wm from '$lib/assets/links/wm.webp';
  import hood from '$lib/assets/links/hood.webp';
  import kitWine from '$lib/assets/promo/kit-vinnye-shkafy.webp';
  import kitDry from '$lib/assets/promo/kit-sushilnye-shkafy.webp';
  import ProductCard from '$lib/components/ProductCard.svelte';
  import KitOfferForm from '$lib/components/KitOfferForm.svelte';
  import KitBlock, { type KitBlockData } from '$lib/components/KitBlock.svelte';
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
  import storeShowroom from '$lib/assets/promo/store-showroom.webp';
  import storeManager from '$lib/assets/promo/store-manager.webp';
  import storeWarehouse from '$lib/assets/promo/store-warehouse.webp';

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
  // блок «Официальная гарантия и сервис» (референс заказчика): 3 зелёные карточки
  const guaranteeCards = [
    { icon: ShieldCheck, title: 'Гарантия от бренда', text: 'Срок гарантии зависит от производителя техники' },
    { icon: Wrench, title: 'Сервис', text: 'Сертифицированные сервисные центры' },
    { icon: Headset, title: 'Техподдержка', text: 'Оперативная помощь специалистов' }
  ];
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

  // кнопка «Записаться на визит в салон» — простая форма заявки (LeadRequestModal)
  let storeVisitOpen = $state(false);
  const storeVisitPrefill = 'Запись на визит в салон (ул. Чистопольская, д. 66)';

  // «Хиты продаж» на мобилке: сначала 4 карточки, «Смотреть ещё» раскрывает список
  let hitsExpanded = $state(false);

  // кнопки комплектных блоков открывают форму заявки с prefill по блоку
  let kitLeadOpen = $state(false);
  let kitLeadPrefill = $state('');
  let kitLeadSource = $state('');
  const openKitLead = (block: (typeof kitBlocks)[number]) => {
    kitLeadPrefill = `Запрос комплекта: ${block.title}`;
    kitLeadSource = block.leadSource;
    kitLeadOpen = true;
  };

  // Комплектные блоки (референсы заказчика) вместо «Популярных категорий».
  // Карточки ведут в свои категории каталога, кнопки блоков — на форму заявки.
  // части зелёной плашки: accent-фрагмент подсвечивается жёлтым (референс «−20%»)
  const kitBlocks: (KitBlockData & { leadSource: string })[] = [
    {
      title: 'Свежесть продуктов и посуды: идеальный микроклимат кухни',
      bannerIcon: 'shield',
      bannerParts: [{ t: 'Хранение на тёплом складе до конца ремонта' }],
      cta: 'Собрать комплект со скидкой',
      leadSource: 'kit-fresh',
      cards: [
        {
          title: 'Холодильники',
          href: '/catalog/krupnaya-bytovaya-tehnika/holodilniki-i-morozilniki',
          img: freeze
        },
        {
          title: 'Морозильные камеры',
          href: '/catalog/krupnaya-bytovaya-tehnika/holodilniki-i-morozilniki/morozilnye-kamery',
          img: freeze
        },
        {
          title: 'Винные шкафы',
          href: '/catalog/vstraivaemaya-tehnika/vinnye-shkafy',
          img: kitWine
        },
        {
          title: 'Посудомоечные машины',
          href: '/catalog/vstraivaemaya-tehnika/posudomoechnye-mashiny',
          img: dw
        }
      ]
    },
    {
      title: 'Комплект приготовления: единый стиль вашей кухни',
      bannerIcon: 'tag',
      bannerParts: [
        { t: 'Скидка до ' },
        { t: '−20%', accent: true },
        { t: ' при покупке комплекта из 3 приборов' }
      ],
      cta: 'Подобрать комплект в едином стиле',
      leadSource: 'kit-cook',
      cards: [
        {
          title: 'Духовые шкафы',
          href: '/catalog/vstraivaemaya-tehnika/duhovye-shkafy',
          img: oven
        },
        {
          title: 'Варочные панели',
          href: '/catalog/vstraivaemaya-tehnika/varochnye-poverhnosti',
          img: hob
        },
        {
          title: 'Кухонные вытяжки',
          href: '/catalog/vytyazhki',
          img: hood
        },
        {
          title: 'Микроволновые печи',
          href: '/catalog/mikrovolnovye-pechi',
          img: mw
        }
      ]
    },
    {
      title: 'Уход за бельем: безупречная забота о тканях',
      bannerIcon: 'truck',
      bannerParts: [{ t: 'Бесплатная доставка и монтаж в колонну при покупке комплекта' }],
      cta: 'Рассчитать выгоду на комплект',
      leadSource: 'kit-care',
      desktopCols: 3,
      cards: [
        {
          title: 'Стиральные машины',
          href: '/catalog/krupnaya-bytovaya-tehnika/stiralnye-i-sushilnye-mashiny/frontalnye-stiralnye-mashiny',
          img: wm
        },
        {
          title: 'Сушильные машины',
          href: '/catalog/krupnaya-bytovaya-tehnika/stiralnye-i-sushilnye-mashiny',
          img: dm
        },
        {
          title: 'Сушильные шкафы',
          href: '/catalog/krupnaya-bytovaya-tehnika/stiralnye-i-sushilnye-mashiny/sushilnye-shkafy',
          img: kitDry
        }
      ]
    }
  ];

  // Лента брендов на главной: состав и порядок заданы заказчиком вручную,
  // остальные бренды из синка в ленту не попадают. Сопоставление — по
  // нормализованному имени (регистр, кавычки-апострофы, «ё»).
  const marqueeBrandKeys = [
    'körting',
    'kuppersberg',
    'delonghi',
    'bosch',
    'aeg',
    'franke',
    'smeg',
    'asko',
    'liebherr',
    'elica',
    'teka',
    'miele',
    'neff',
    'gaggenau',
    'de dietrich',
    'kuppersbusch',
    'omoikiri'
  ];
  const normBrand = (s: string) =>
    s.toLowerCase().replace(/[’'`]/g, '').replace(/ё/g, 'е').replace(/ö/g, 'o').trim();
  const marqueeBrands = $derived.by(() => {
    const pool = data.syncBrands ?? [];
    return marqueeBrandKeys
      .map((key) => pool.find((b) => normBrand(b) === normBrand(key)))
      .filter((b): b is string => Boolean(b));
  });

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
      'Подберём холодильник или морозильную камеру Liebherr под размеры кухни, сценарий хранения и бюджет.',
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
    text: 'Оставьте заявку — подберём решения, которые подойдут по размерам, цене и характеристикам.',
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
        text: 'Рассчитаем полную стоимость комплекта: техника, бесплатная доставка, подъём, установка и дополнительные работы — без скрытых расходов.'
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
  <section class="hero-section overflow-hidden rounded-2xl">
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

<!-- блок с формой «Зафиксировать выгоду за комплект» по референсу заказчика
     (секция своя, внутри компонента, без обёртки); ИИ-помощник (/podbor) остаётся — ссылка в шапке -->
<KitOfferForm />

{#each kitBlocks as block (block.title)}
  <KitBlock {block} oncta={() => openKitLead(block)} />
  <div class="kit-divider" aria-hidden="true"></div>
{/each}

{#if marqueeBrands.length}
  <!-- mb-3: внутренний -mb-3 компенсации marquee съедает штатный gap до следующей секции -->
  <section class="mb-3">
    <h2 class="section-title">Бренды — которым доверяют</h2>
    <!-- у marquee свой padding 12px (иначе тень плиток режется); отрицательными марджинами
         компенсируем его и штатные 12px секции, чтобы итоговый зазор был 12px, а не 24+ -->
    <div class="-mt-3! -mb-3!">
      <BrandsGrid brands={marqueeBrands} />
    </div>
  </section>
{/if}

<section class="hits-section">
  <h2 class="section-title">Хиты продаж — всегда доступные к заказу</h2>
  <div class="hits-grid" class:hits-grid--expanded={hitsExpanded}>
    {#each data.hits as hit (hit.id)}
      <ProductCard product={hit} />
    {/each}
  </div>
  {#if !hitsExpanded}
    <button type="button" class="hits-more" onclick={() => (hitsExpanded = true)}>
      Смотреть ещё
      <ChevronDown size={16} strokeWidth={2.2} />
    </button>
  {/if}
</section>

<section>
  <PrivilegesSection />
</section>

<section>
  <SelectionQuiz quiz={askoQuiz} />
</section>

<section>
  <PromoOffer offer={liebherrOffer} />
</section>

<section>
  <!-- блок Omoikiri по референсу: шапка-лого + 3 типа карточек (тёмная фото / светлая / зелёная) -->
  <div class="omo">
    <div class="omo__head">
      <h2 class="omo__logo">OMOIKIRI</h2>
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
        <span class="omo-card__arrow omo-card__arrow--gold"
          ><ChevronRight size={18} strokeWidth={2.4} /></span
        >
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
        <span class="omo-card__arrow omo-card__arrow--gold"
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
        <span class="omo-card__arrow omo-card__arrow--gold"
          ><ChevronRight size={18} strokeWidth={2.4} /></span
        >
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
<LeadRequestModal bind:open={storeVisitOpen} prefill={storeVisitPrefill} source="store-visit" />
<LeadRequestModal bind:open={kitLeadOpen} prefill={kitLeadPrefill} source={kitLeadSource} />

{#if AC_ENABLED}
  <section>
    <div class="promo-banner promo-banner--ac">
      <div class="promo-banner__head">
        <div class="promo-banner__icon">
          <Wind size={26} strokeWidth={2} />
        </div>
        <div class="promo-banner__text">
          <h2>Кондиционеры</h2>
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

<section>
  <SelectionQuiz quiz={liebherrQuiz} />
</section>

<section>
  <ReviewsSection />
</section>

<section>
  <div class="promo-banner promo-banner--store">
    <div class="promo-banner__head">
      <div class="promo-banner__text">
        <h2>Приглашаем в наш офлайн-магазин кухонной техники</h2>
        <span>
          Здесь вы сможете увидеть модели вживую, сравнить бренды, проконсультироваться со
          специалистом и подобрать технику под ваши задачи.
        </span>
      </div>
    </div>
    <div class="store-cards">
      <article class="store-card">
        <h3 class="store-card__name">Шоурум</h3>
        <div class="store-card__photo">
          <img src={storeShowroom} alt="Шоурум: кухни с встроенной техникой" loading="lazy" />
        </div>
        <div class="store-card__body">
          <p class="store-card__line">г. Казань, ул. Чистопольская, д. 66</p>
          <p class="store-card__line">Ежедневно с 9:00 до 18:00</p>
        </div>
        <a
          class="store-card__btn"
          href="https://yandex.ru/maps/org/192917903315/"
          target="_blank"
          rel="noopener"
        >
          Построить маршрут
          <ArrowUpRight size={14} strokeWidth={2.2} />
        </a>
      </article>
      <article class="store-card">
        <h3 class="store-card__name">Менеджер</h3>
        <div class="store-card__photo store-card__photo--top">
          <img src={storeManager} alt="Личный менеджер" loading="lazy" />
        </div>
        <!-- без имени/телефона и «Написать в Макс» — сразу запись на визит -->
        <div class="store-card__body">
          <p class="store-card__line">Личный менеджер</p>
        </div>
        <button type="button" class="store-card__btn" onclick={() => (storeVisitOpen = true)}>
          Записаться на визит в салон
        </button>
      </article>
      <article class="store-card">
        <h3 class="store-card__name">Склад</h3>
        <div class="store-card__photo">
          <img src={storeWarehouse} alt="Собственный склад хранения" loading="lazy" />
        </div>
        <div class="store-card__body">
          <p class="store-card__line">Собственный склад хранения</p>
          <p class="store-card__line">Индустриальный парк М-7</p>
        </div>
        <a
          class="store-card__btn"
          href="https://yandex.ru/maps/?text=Казань, Индустриальный парк M-7"
          target="_blank"
          rel="noopener"
        >
          Хранение до конца ремонта
        </a>
      </article>
    </div>
  </div>
</section>


<section class="guarantee">
  <div class="guarantee__head">
    <h2 class="guarantee__title">Официальная гарантия и сервис</h2>
    <p class="guarantee__subtitle">Спокойствие и уверенность на каждом этапе</p>
  </div>
  <div class="guarantee__grid">
    {#each guaranteeCards as c (c.title)}
      <article class="guarantee__card">
        <span class="guarantee__icon"><c.icon size={26} strokeWidth={1.7} /></span>
        <h3 class="guarantee__name">{c.title}</h3>
        <p class="guarantee__text">{c.text}</p>
      </article>
    {/each}
  </div>
</section>

<style lang="scss">
  // разделитель между kit-блоками: вместо width 80% — градиент на всю ширину,
  // края растворяются в прозрачность, середина в полный цвет (тон плейсхолдер)
  .kit-divider {
    height: 1px;
    background: linear-gradient(to right, transparent, #00000017, transparent);
  }
  .hits-section {
    display: flex;
    flex-direction: column;
    // зазоры шапка↔сетка↔«Смотреть ещё» — один источник: gap секции
    // (глобальный хвостовой margin h2 внутри гасим, иначе задвоится)
    gap: $sp-3;
    .section-title {
      margin-bottom: 0;
    }
  }
  .hits-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    @media (min-width: 1280px) {
      grid-template-columns: repeat(5, 1fr);
    }
    // на мобилке сначала 4 хита, «Смотреть ещё» раскрывает весь список
    @media (max-width: 1024px) {
      grid-template-columns: repeat(2, 1fr);
      > :global(:nth-child(n + 5)) {
        display: none;
      }
      &.hits-grid--expanded > :global(:nth-child(n + 5)) {
        display: block;
      }
    }
    @media (max-width: 560px) {
      grid-template-columns: 1fr;
    }
  }
  .hits-more {
    display: none;
    align-items: center;
    justify-content: center;
    align-self: center;
    gap: $sp-1;
    width: 100%;
    max-width: 420px;
    height: 44px;
    border: 1px solid rgba($green, 0.35);
    border-radius: 999px;
    background: #fff;
    color: #111827;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition:
      border-color 0.15s ease,
      background 0.15s ease,
      color 0.15s ease;
    &:hover {
      border-color: $green;
      background: rgba($green, 0.06);
      color: $green;
    }
    @media (max-width: 1024px) {
      display: inline-flex;
    }
  }
  // тёмные карточки магазина (референс заказчика): шоурум / менеджер / склад
  .store-cards {
    display: grid;
    gap: 12px;

    @media (min-width: 1024px) {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }
  .store-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 14px;
    border-radius: 14px;
    background: #3c403c;
    color: #fff;
    text-align: center;

    &__name {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 500;
      color: #fff;
    }

    // фото-слот карточки: заливка с обрезкой, как на референсе
    &__photo {
      height: 150px;
      border-radius: 12px;
      overflow: hidden;

      img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      // у портрета менеджера лицо в верхней части кадра
      &--top img {
        object-position: top;
      }
    }

    // растёт и занимает свободную высоту карточки — кнопки по нижней кромке
    &__body {
      flex: 1 1 auto;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 4px;
    }

    &__line {
      margin: 0;
      font-size: 0.85rem;
      line-height: 1.35;
      color: rgba(255, 255, 255, 0.85);
    }

    &__btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      width: 100%;
      height: 38px;
      border-radius: 10px;
      background: rgba(0, 0, 0, 0.35);
      color: #fff;
      font-size: 0.85rem;
      font-weight: 600;
      text-decoration: none;
      white-space: nowrap;
      transition: background 0.15s ease;

      &:hover {
        background: rgba(0, 0, 0, 0.5);
      }
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
  // размер/вес/цвет — из глобального h2 (typography.scss), здесь только выравнивание
  .section-title {
    text-align: center;
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
  .promo-banner--ac .promo-banner__icon {
    background: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
  }
  .promo-banner__text {
    display: flex;
    flex-direction: column;
    gap: $sp-2;
    // размер/вес h2 — глобальные (typography.scss); margin: 0 — зазор ведёт gap
    h2 {
      margin: 0;
    }
    span {
      font-size: 0.92rem;
      line-height: 1.4;
      color: #475569;
    }
  }
  // только store-баннер: заголовок и подзаголовок по центру (вариант --ac не трогаем)
  .promo-banner--store .promo-banner__text {
    text-align: center;
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
  // размер/вес — из глобального h2; margin: 0 — зазор в шапке ведёт gap контейнера
  .omo__logo {
    margin: 0;
    text-align: center;
  }
  .omo__tagline {
    color: #475569;
    font-size: 0.9375rem;
    line-height: 1.4;
    text-align: center;
  }
  // «металлик» золота без картинки — общий градиент $gold-gradient (variables.scss)
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
        background: $gold-gradient;
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
        background: $gold-gradient;
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
  // вертикальные отступы между секциями задаёт gap контейнера в +layout.svelte
  @media (min-width: 640px) {
    .promo-cards {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  @media (max-width: 639px) {
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
    }
    .promo-card__img {
      width: 118px;
      height: 118px;
    }
  }
  @media (min-width: 1024px) {
    .promo-banner--ac .promo-cards {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }
  // «Официальная гарантия и сервис» (референс заказчика): 3 зелёные карточки,
  // круглые значки сидят на верхней кромке (наполовину снаружи) и светятся
  .guarantee {
    display: flex;
    flex-direction: column;
    align-items: center;
    // 40px = выступ иконки над карточкой (32px) + 8px воздуха до подзаголовка:
    // меньше — иконка ложится на текст (проверено замером)
    gap: 40px;
    text-align: center;

    &__head {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: $sp-2;
    }

    // размер/вес — из глобального h2 (typography.scss); margin: 0 — зазор ведёт gap шапки
    &__title {
      margin: 0;
    }

    &__subtitle {
      margin: 0;
      font-size: 0.92rem;
      line-height: 1.4;
      color: #475569;
    }

    &__grid {
      display: grid;
      // в стопке иконка выступает над карточкой на 32px — даём ей чистый воздух
      gap: 44px;
      width: 100%;

      @media (min-width: 1024px) {
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
      }
    }

    &__card {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: $sp-1;
      padding: 44px 16px 18px;
      border-radius: 16px;
      background: $green;
      color: #fff;
    }

    &__icon {
      position: absolute;
      top: 0;
      left: 50%;
      transform: translate(-50%, -50%);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 64px;
      height: 64px;
      border-radius: 50%;
      border: 1px solid rgba($yellow, 0.6);
      // сочно-зелёный фон, заметно светлее карточки — как на референсе
      background: radial-gradient(circle at 50% 32%, #43b97e, #17814e);
      color: #f2f7ef;
      box-shadow:
        0 0 18px rgba(67, 185, 126, 0.55),
        0 0 44px rgba($green-light, 0.4);
    }

    &__name {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
      color: #fff;
    }

    &__text {
      margin: 0;
      font-size: 0.85rem;
      line-height: 1.4;
      color: rgba(255, 255, 255, 0.75);
    }
  }
</style>
