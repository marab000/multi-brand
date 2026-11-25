<script lang="ts">
  import {
    CheckCircle,
    ChevronDown,
    Wind,
    ChevronRight,
    Headset,
    ShieldCheck,
    Wrench
  } from 'lucide-svelte';
  import { toast } from 'svelte-sonner';
  import Slider from '$lib/components/Slider.svelte';
  import { cityForms } from '$lib/cityForms';
  import { apiFetch } from '$lib/api';
  import { phoneMask } from '$lib/actions/phoneMask';
  import { isValidRuPhone, normalizeRuPhone } from '$lib/utils/phone';
  // фото плиток kit-блоков (ревью 23.11: фото из папки qweqwe123, V-ZUG/ASKO/Bosch/Liebherr)
  import kitbOven from '$lib/assets/promo/kitb-oven-vzug.webp';
  import kitbHob from '$lib/assets/promo/kitb-hob-asko.webp';
  import kitbHood from '$lib/assets/promo/kitb-hood-asko.webp';
  import kitbMw from '$lib/assets/promo/kitb-mw-bosch.webp';
  import kitbFridge from '$lib/assets/promo/kitb-fridge-vzug.webp';
  import kitbFreezer from '$lib/assets/promo/kitb-freezer-liebherr.webp';
  import kitbWine from '$lib/assets/promo/kitb-wine-vzug.webp';
  import kitbDw from '$lib/assets/promo/kitb-dw-asko.webp';
  import kitbWm from '$lib/assets/promo/kitb-wm-asko.webp';
  import kitbDm from '$lib/assets/promo/kitb-dm-asko.webp';
  import kitbDryer from '$lib/assets/promo/kitb-dryer-asko.webp';
  import kitbLaundry from '$lib/assets/promo/kitb-laundry-bosch.webp';
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
  import mvVisitBg from '$lib/assets/promo/mv-visit-bg.webp';

  let { data } = $props();
  const city = $derived(cityForms(data?.city));
  // блок «Гарантия на технику. Поддержка от нас.» (ревью 17.11.2026): 3 зелёные карточки
  const guaranteeCards = [
    {
      icon: ShieldCheck,
      title: 'Гарантия на вашу модель',
      text: 'Уточним срок и условия гарантии до покупки. Передадим необходимые документы вместе с техникой.'
    },
    {
      icon: Wrench,
      title: 'Сервисное обслуживание',
      text: 'Подскажем, в какой сервисный центр обратиться и какие документы понадобятся.'
    },
    {
      icon: Headset,
      title: 'Помощь после покупки',
      text: 'Ответим на вопросы по заказу и поможем с обращением по гарантии.'
    }
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

  // Блок «Выезд менеджера на дом» (ревью 25.11, вместо карточки визита в салон):
  // инлайн-форма уходит в общий лид-конвейер /api/leads (письмо менеджеру).
  // Согласие одно (две галочки — чужой паттерн, отпугивают), ссылки ведут
  // на наши /privacy и /offer
  let mvName = $state('');
  let mvPhone = $state('');
  let mvAddress = $state('');
  let mvAgree = $state(false);
  let mvLoading = $state(false);

  const mvSubmit = async () => {
    if (!mvName.trim()) {
      toast.error('Введите имя');
      return;
    }
    if (!isValidRuPhone(mvPhone)) {
      toast.error('Введите корректный номер телефона');
      return;
    }
    if (!mvAddress.trim()) {
      toast.error('Введите адрес');
      return;
    }
    if (!mvAgree) {
      toast.error('Подтвердите согласие на обработку данных');
      return;
    }
    if (mvLoading) return;
    mvLoading = true;
    try {
      await apiFetch(fetch, '/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: mvName.trim(),
          phone: normalizeRuPhone(mvPhone),
          message: `Заявка на выезд менеджера. Адрес: ${mvAddress.trim()}`,
          source: 'manager-visit'
        })
      });
      if (typeof window !== 'undefined') window.ym?.(108518016, 'reachGoal', 'lead_submit');
      toast.success('Заявка отправлена — менеджер свяжется с вами');
      mvName = '';
      mvPhone = '';
      mvAddress = '';
      mvAgree = true;
    } catch {
      toast.error('Не удалось отправить заявку');
    } finally {
      mvLoading = false;
    }
  };

  // «Хиты продаж» на мобилке: сначала 4 карточки, «Смотреть ещё» раскрывает список
  let hitsExpanded = $state(false);

  // Комплектные блоки (референсы заказчика) вместо «Популярных категорий».
  // Карточки ведут в свои категории каталога. По ревью 17.11.2026: у блоков
  // короткие заголовки, плашки и кнопки-CTA убраны.
  const kitBlocks: KitBlockData[] = [
    {
      title: 'Техника для готовки в едином стиле',
      cards: [
        {
          title: 'Духовые шкафы',
          href: '/catalog/vstraivaemaya-tehnika/duhovye-shkafy',
          img: kitbOven
        },
        {
          title: 'Варочные панели',
          href: '/catalog/vstraivaemaya-tehnika/varochnye-poverhnosti',
          img: kitbHob
        },
        {
          title: 'Кухонные вытяжки',
          href: '/catalog/vytyazhki',
          img: kitbHood
        },
        {
          title: 'Микроволновые печи',
          href: '/catalog/mikrovolnovye-pechi',
          img: kitbMw
        }
      ]
    },
    {
      title: 'Для свежих продуктов и безупречно чистой посуды',
      cards: [
        {
          title: 'Холодильники',
          href: '/catalog/krupnaya-bytovaya-tehnika/holodilniki-i-morozilniki',
          img: kitbFridge
        },
        {
          title: 'Морозильные камеры',
          href: '/catalog/krupnaya-bytovaya-tehnika/holodilniki-i-morozilniki/morozilnye-kamery',
          img: kitbFreezer
        },
        {
          title: 'Винные шкафы',
          href: '/catalog/vstraivaemaya-tehnika/vinnye-shkafy',
          img: kitbWine
        },
        {
          title: 'Посудомоечные машины',
          href: '/catalog/vstraivaemaya-tehnika/posudomoechnye-mashiny',
          img: kitbDw
        }
      ]
    },
    {
      title: 'Бережная стирка. Комфортная сушка.',
      cards: [
        {
          title: 'Стиральные машины',
          href: '/catalog/krupnaya-bytovaya-tehnika/stiralnye-i-sushilnye-mashiny/frontalnye-stiralnye-mashiny',
          img: kitbWm
        },
        {
          title: 'Сушильные машины',
          href: '/catalog/krupnaya-bytovaya-tehnika/stiralnye-i-sushilnye-mashiny/sushilnye-mashiny',
          img: kitbDm
        },
        {
          title: 'Сушильные шкафы',
          href: '/catalog/krupnaya-bytovaya-tehnika/stiralnye-i-sushilnye-mashiny/sushilnye-shkafy',
          img: kitbDryer
        },
        {
          title: 'Прачечное оборудование',
          href: '/catalog/krupnaya-bytovaya-tehnika/stiralnye-i-sushilnye-mashiny/stiralno-sushilnye-mashiny',
          img: kitbLaundry
        }
      ]
    }
  ];

  // Лента брендов на главной: состав и порядок заданы заказчиком вручную
  // (ревью 17.11.2026 — ровно 12 брендов), остальные бренды из синка в ленту
  // не попадают. Сопоставление — по нормализованному имени (регистр, апострофы, «ё»).
  const marqueeBrandKeys = [
    'asko',
    'liebherr',
    'körting',
    'kuppersberg',
    'smeg',
    'bosch',
    'aeg',
    'miele',
    'franke',
    'elica',
    'teka',
    'delonghi'
  ];
  const normBrand = (s: string) =>
    s.toLowerCase().replace(/[’'`]/g, '').replace(/ё/g, 'е').replace(/ö/g, 'o').trim();
  const marqueeBrands = $derived.by(() => {
    const pool = data.syncBrands ?? [];
    return marqueeBrandKeys
      .map((key) => pool.find((b) => normBrand(b) === normBrand(key)))
      .filter((b): b is string => Boolean(b));
  });

  // квизы главной: контент — из демо-лендингов брендов (ASKO, Liebherr),
  // формулировки вопросов и подписи под кнопкой — по ревью 17.11.2026
  const quizNote = 'Менеджер уточнит детали и предложит подходящие модели с расчётом стоимости.';
  const askoQuiz = {
    headingLines: ['Больше времени для себя.', 'Заботу о вещах — ASKO.'],
    description:
      'Подберём стиральную и сушильную машины под ваши задачи и пространство дома. Сохраним до готовности к установке, доставим и подключим.',
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
    installLabel: 'Как хотите разместить технику?',
    places: ['Рядом', 'В колонну — нужна проверка', 'Пока не знаю'],
    submitLabel: 'Подобрать технику ASKO',
    needLabel: 'Какую технику подбираем?',
    timingLabel: 'Когда планируете получить технику?',
    note: quizNote,
    leadTitle: 'Запрос на подбор ASKO:',
    image: askoQuizPhoto
  };
  const liebherrQuiz = {
    headingLines: ['Свежесть продуктов.', 'Больше места для любимого.'],
    description:
      'Подберём холодильник или морозильную камеру Liebherr под размеры кухни, запас продуктов и ваш бюджет.',
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
    installLabel: 'Как хотите разместить технику?',
    places: ['Отдельностоящая', 'Встраиваемая', 'Пока не знаю'],
    submitLabel: 'Получить подбор Liebherr',
    needLabel: 'Какую технику подбираем?',
    timingLabel: 'Когда планируете получить технику?',
    note: quizNote,
    leadTitle: 'Запрос на подбор Liebherr:',
    image: liebherrQuizPhoto
  };
  // блок-акция (после ASKO-квиза): тексты по ревью 17.11.2026 — «Специальные
  // условия на комплект техники», кнопка ведёт на расчёт комплекта
  const liebherrOffer = {
    eyebrow: 'Специальные условия на комплект техники',
    titleLines: ['От подбора техники', '— до готовой кухни.'],
    text: 'Подберём комплект под размеры кухни, ваши задачи и бюджет. Заранее согласуем хранение, доставку и установку — и покажем, сколько всё будет стоить.',
    buttonLabel: 'Получить расчёт комплекта',
    leadTitle:
      'Запрос на расчёт комплекта: хранение до конца ремонта, проверка размеров и подключения, доставка и установка, понятная стоимость.',
    note: 'Условия акции, срок хранения и стоимость услуг согласуем до оформления заказа и зафиксируем в нём.',
    benefits: [
      {
        title: 'Хранение до конца ремонта',
        text: 'Сохраним заказ до готовности кухни. Срок хранения и дату доставки согласуем заранее.'
      },
      {
        title: 'Проверка размеров и подключения',
        text: 'Сверим размеры техники и ниш, необходимые зазоры, открывание дверей и расположение коммуникаций.'
      },
      {
        title: 'Доставка и установка',
        text: 'Согласуем доставку, подъём и установку по вашему адресу. Заранее уточним, что нужно подготовить для подключения.'
      },
      {
        title: 'Понятная стоимость',
        text: 'Подготовим подробный расчёт: техника, доставка, подъём, установка и дополнительные работы. Отдельно покажем скидки и бесплатные услуги.'
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
  <meta
    property="og:title"
    content={`Бытовая техника в ${city.prep} — интернет-магазин Мультибренд`}
  />
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
  <KitBlock {block} />
  <div class="kit-divider" aria-hidden="true"></div>
{/each}

{#if marqueeBrands.length}
  <!-- mb-3: внутренний -mb-3 компенсации marquee съедает штатный gap до следующей секции -->
  <section class="mb-3">
    <h2 class="section-title">Бренды, которым доверяют</h2>
    <!-- у marquee свой padding 12px (иначе тень плиток режется); отрицательными марджинами
         компенсируем его и штатные 12px секции, чтобы итоговый зазор был 12px, а не 24+ -->
    <div class="-mt-3! -mb-3!">
      <BrandsGrid brands={marqueeBrands} />
    </div>
  </section>
{/if}

{#if data.hits.length}
  <section class="hits-section">
    <h2 class="section-title">Хиты продаж — всегда доступные к заказу</h2>
    <div class="hits-grid" class:hits-grid--expanded={hitsExpanded}>
      {#each data.hits as hit (hit.id)}
        <ProductCard product={hit} />
      {/each}
    </div>
    {#if !hitsExpanded && data.hits.length > 4}
      <button type="button" class="hits-more" onclick={() => (hitsExpanded = true)}>
        Смотреть ещё
        <ChevronDown size={16} strokeWidth={2.2} />
      </button>
    {/if}
  </section>
{/if}

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
  <!-- блок Omoikiri по референсу: шапка-лого + 3 типа карточек (тёмная фото / светлая / зелёная);
       тексты и кнопки карточек — по ревью 17.11.2026 -->
  <div class="omo">
    <div class="omo__head">
      <h2 class="omo__logo">OMOIKIRI</h2>
      <span class="omo__tagline">Всё для вашей кухни — в едином стиле.</span>
      <p class="omo__intro">
        Подберём мойку и смеситель в сочетающихся оттенках, дополним комплект подходящим
        измельчителем отходов.
      </p>
    </div>

    <div class="omo__cards">
      <!-- ревью 23.11: порядок 1–4 — комплект первым, дальше мойки/смесители/
           измельчители; плашки «Японское качество» и счётчики моделей сняты,
           стрелки белые (базовый кружок без gold-модификатора) -->

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
        <span class="omo-card__stack">
          <span class="omo-card__sub">Мойка • смеситель • измельчитель в едином цвете</span>
          <span class="omo-card__name">Собери комплект для кухни с выгодой до 15%</span>
        </span>
        <span class="omo-card__arrow"><ChevronRight size={18} strokeWidth={2.4} /></span>
      </button>

      <!-- тёмная фото-карточка: мойки (сгенерированная сцена кухни, заменит товарное фото) -->
      <a href="/catalog/kuhonnye-moyki?brand=Omoikiri" class="omo-card omo-card--photo">
        <img class="omo-card__bg" src={omoikiriKitchen} alt="Мойки Omoikiri на кухне" loading="lazy" />
        <span class="omo-card__shade"></span>
        <span class="omo-card__name">Кухонные мойки</span>
        <span class="omo-card__arrow"><ChevronRight size={18} strokeWidth={2.4} /></span>
      </a>

      <!-- светлая карточка: смесители (референс: светло, товар по центру) -->
      <a href="/catalog/smesiteli?brand=Omoikiri" class="omo-card omo-card--light">
        <img class="omo-card__img" src={omoikiriFaucet} alt="Смесители Omoikiri" loading="lazy" />
        <span class="omo-card__name">Смесители</span>
        <span class="omo-card__arrow"><ChevronRight size={18} strokeWidth={2.4} /></span>
      </a>

      <!-- зелёная карточка: измельчители -->
      <a
        href="/catalog/izmelchiteli-pischevyh-othodov?brand=Omoikiri"
        class="omo-card omo-card--green"
      >
        <img class="omo-card__side" src={omoikiriDisposer} alt="Измельчитель Omoikiri Nagare" loading="lazy" />
        <span class="omo-card__name">Измельчители отходов</span>
        <span class="omo-card__arrow"><ChevronRight size={18} strokeWidth={2.4} /></span>
      </a>
    </div>
  </div>
</section>
<LeadRequestModal bind:open={bundleOpen} prefill={bundlePrefill} />

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
  <div class="mv-visit" style="--mv-bg: url({mvVisitBg})">
    <!-- ревью 25.11: вместо «Познакомьтесь с техникой лично» — блок «Выезд менеджера
         на дом» (референс заказчика). Фон-фото — тёмная кухня (актив заказчика),
         поверх затемняющий градиент для читаемости текста.
         Заявки уходят в общий лид-конвейер /api/leads. -->
    <div class="mv-visit__info">
      <h2 class="mv-visit__title">Выезд менеджера на дом — <span>бесплатно!</span></h2>
      <p class="mv-visit__lead">Замер, подбор техники, консультация — у вас на кухне</p>
      <p class="mv-visit__text">
        Расскажите о вашем проекте — менеджер приедет на объект, снимет размеры ниш, поможет
        подобрать технику под интерьер и бюджет и сразу посчитает стоимость комплекта.
      </p>
      <ul class="mv-visit__points">
        <li><CheckCircle size={20} strokeWidth={1.8} /> Удобное для вас время</li>
        <li><CheckCircle size={20} strokeWidth={1.8} /> Замер ниш на объекте</li>
        <li><CheckCircle size={20} strokeWidth={1.8} /> Подбор комплекта под проект</li>
        <li><CheckCircle size={20} strokeWidth={1.8} /> Расчёт стоимости на месте</li>
      </ul>
      <p class="mv-visit__note">
        * Бесплатно при заказе комплекта от двух моделей крупной бытовой техники.
      </p>
    </div>
    <form
      class="mv-visit__form"
      onsubmit={(e) => {
        e.preventDefault();
        void mvSubmit();
      }}
    >
      <h3>Оставить заявку на выезд</h3>
      <input
        class="input primary"
        type="text"
        placeholder="Ваше имя *"
        autocomplete="name"
        bind:value={mvName}
        disabled={mvLoading}
      />
      <div class="with-prefix">
        <span class="prefix">+7</span>
        <input
          class="input primary"
          type="tel"
          placeholder="999 123 45 67"
          autocomplete="tel"
          inputmode="numeric"
          value={mvPhone}
          use:phoneMask={{ value: mvPhone, onAccept: (digits) => (mvPhone = digits) }}
          disabled={mvLoading}
        />
      </div>
      <input
        class="input primary"
        type="text"
        placeholder="Адрес *"
        bind:value={mvAddress}
        disabled={mvLoading}
      />
      <label class="checkbox secondary">
        <input type="checkbox" bind:checked={mvAgree} disabled={mvLoading} />
        <span class="box"></span>
        <span class="text">
          Я соглашаюсь с <a href="/privacy" target="_blank" rel="noopener">политикой
          конфиденциальности</a> и <a href="/offer" target="_blank" rel="noopener">условиями
          оферты</a> на обработку персональных данных
        </span>
      </label>
      <button
        class="btn primary mv-visit__submit"
        type="submit"
        disabled={!mvAgree || mvLoading}
      >
        {mvLoading ? 'Отправляем...' : 'Отправить заявку'}
      </button>
    </form>
  </div>
</section>

<section class="guarantee">
  <div class="guarantee__head">
    <h2 class="guarantee__title">Гарантия на технику. Поддержка от нас.</h2>
    <p class="guarantee__subtitle">
      Поможем разобраться в условиях гарантии и подскажем, куда обратиться при неисправности.
    </p>
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
  @use 'sass:color';
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
  // «Выезд менеджера на дом» (ревью 25.11): тёмный блок, слева текст с чек-пунктами,
  // справа белая форма заявки. Фон — фото кухни (актив заказчика) + затемняющий
  // градиент слева (текст) направо; внизу стоп — градиент-заглушка без фото.
  .mv-visit {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 400px;
    gap: $sp-4;
    align-items: center;
    padding: $sp-6;
    border-radius: 24px;
    background-image:
      linear-gradient(
        95deg,
        rgba(10, 14, 11, 0.85) 0%,
        rgba(10, 14, 11, 0.6) 45%,
        rgba(10, 14, 11, 0.3) 100%
      ),
      var(--mv-bg, linear-gradient(105deg, #0c120d 0%, #141d16 55%, #24352a 100%));
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    @media (max-width: 1023px) {
      grid-template-columns: 1fr;
      padding: $sp-4;
      border-radius: 16px;
    }

    &__info {
      display: flex;
      flex-direction: column;
      gap: $sp-3;
      color: #fff;
    }

    &__title {
      margin: 0;
      max-width: 22ch;
      color: #fff;
      text-transform: uppercase;
      font-size: clamp(1.5rem, 2.6vw, 2.25rem);
      font-weight: 800;
      line-height: 1.12;
      letter-spacing: 0.01em;
      span {
        color: #3fae5a;
      }
    }

    &__lead {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 600;
    }

    &__text {
      margin: 0;
      max-width: 52ch;
      font-size: 0.9375rem;
      line-height: 1.55;
      color: rgba(255, 255, 255, 0.72);
    }

    &__points {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: $sp-2 $sp-4;
      margin: 0;
      padding: 0;
      list-style: none;
      li {
        display: flex;
        align-items: center;
        gap: $sp-2;
        font-size: 0.9375rem;
        color: rgba(255, 255, 255, 0.92);
      }
      li :global(svg) {
        flex-shrink: 0;
        color: #3fae5a;
      }
      @media (max-width: 560px) {
        grid-template-columns: 1fr;
      }
    }

    &__note {
      margin: 0;
      max-width: 52ch;
      font-size: 0.8125rem;
      line-height: 1.5;
      color: rgba(255, 255, 255, 0.5);
    }

    &__form {
      display: grid;
      gap: 10px;
      padding: $sp-4;
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 16px;
      background: #fff;
      h3 {
        margin: 0;
        font-size: 1.125rem;
        font-weight: 700;
        color: #111827;
      }
      :global(.checkbox .text a) {
        color: $green;
        text-decoration: underline;
        text-underline-offset: 2px;
      }
    }

    // зелёная CTA — цвет/форма общие (.btn.primary), здесь только геометрия
    &__submit {
      height: 48px;
      border-radius: 10px;
      font-size: 0.9375rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.02em;
      &:disabled {
        opacity: 0.55;
        cursor: not-allowed;
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
  // размер/вес — из глобального h2; margin: 0 — зазор ведёт gap контейнера
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
  // вводный абзац под tagline (ревью: «Подберём мойку и смеситель...»)
  .omo__intro {
    margin: 0 auto;
    max-width: 560px;
    color: #64748b;
    font-size: 0.9rem;
    line-height: 1.5;
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
      radial-gradient(ellipse 45% 75% at 72% 55%, rgba($green-light, 0.45), transparent 72%),
      linear-gradient(100deg, color.scale($green, $lightness: -12%) 0%, color.scale($green, $lightness: 8%) 100%);
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
      // низ карточки — как у карточек 1–2 (bottom: 18px базового .omo-card__name)
      left: 18px;
      max-width: 52%;
      color: #fff;
      font-size: 1.4rem;
      line-height: 1.2;
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
          color: rgba($yellow, 0.8);
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
  // «Гарантия на технику. Поддержка от нас.» (ревью 17.11.2026): 3 зелёные карточки,
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
      max-width: 560px;
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
      background: radial-gradient(circle at 50% 32%, color.scale($green-light, $lightness: 15%), $green);
      color: #fff;
      box-shadow:
        0 0 18px rgba($green-light, 0.55),
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
