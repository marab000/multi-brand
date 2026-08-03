<script lang="ts">
  import { BadgePercent, Warehouse, ConciergeBell, Sparkles, ArrowRight, Wind } from 'lucide-svelte';
  import Slider from '$lib/components/Slider.svelte';
  import VideoSection from '$lib/components/VideoSection.svelte';
  import hob from '$lib/assets/links/hob.webp';
  import coffee from '$lib/assets/links/coffee.webp';
  import dw from '$lib/assets/links/dw.webp';
  import oven from '$lib/assets/links/oven.webp';
  import freeze from '$lib/assets/links/freeze.webp';
  import dm from '$lib/assets/links/dm.webp';
  import mw from '$lib/assets/links/mw.webp';
  import wm from '$lib/assets/links/wm.webp';
  import hood from '$lib/assets/links/hood.webp';
  import kit1 from '$lib/assets/kits/1.webp';
  import kit2 from '$lib/assets/kits/2.webp';
  import kit3 from '$lib/assets/kits/3.webp';
  import kit4 from '$lib/assets/kits/4.webp';
  import BrandsGrid from '$lib/components/BrandsGrid.svelte';
  import ReviewsSection from '$lib/components/ReviewsSection.svelte';
  import grandexLogo from '$lib/assets/brands/Grandex Aqua.webp';
  import grandexMoiki from '$lib/assets/promo/grandex-moiki.webp';
  import grandexSmesiteli from '$lib/assets/promo/grandex-smesiteli.webp';
  import acSplit from '$lib/assets/promo/ac-split.webp';
  import acInvertor from '$lib/assets/promo/ac-invertor.webp';
  import acMobile from '$lib/assets/promo/ac-mobile.webp';
  const kitColor = '#3e6f4f';

  let { data } = $props();
  const desktopImages = $derived(data.desktopSlides || []);
  const mobileImages = $derived(data.mobileSlides || []);
  const features = [
    {
      title: 'Оформим честную рассрочку на 12 месяцев без процентов, переплат и скрытых комиссий всего за 5 минут',
      pointsTitle: 'Как это работает?',
      points: [
        'Техника сразу: забираете оборудование сейчас, а первый платеж — только через месяц.',
        'Без переплат: общая сумма просто делится на 12 равных частей.',
        'Все онлайн: никуда ехать не нужно, оформление происходит удаленно.'
      ],
      icon: BadgePercent
    },
    {
      title: 'Ваш персональный менеджер 24/7',
      pointsTitle: 'Почему это удобно для вас',
      points: [
        'Экономия времени: вам не нужно часами искать модели на разных сайтах — мы всё сделаем сами.',
        'Строго в бюджет: подбираем технику под ваши финансовые рамки без переплат.',
        'Точно в срок: учитываем даты поставки, чтобы ваш проект запустился вовремя.',
        'Любые бренды: соберём комплект из оборудования разных марок в одном месте.',
        'Один контакт: вы общаетесь только с одним человеком, который решает все вопросы.'
      ],
      icon: ConciergeBell
    },
    {
      title: 'Ваш личный склад бесплатно: храним технику, пока идёт ремонт!',
      text: 'Закажите оборудование сейчас по выгодной цене, а мы бесплатно сохраним его на нашем охраняемом складе площадью 1600 м². Привезем технику на объект ровно к тому моменту, когда она вам понадобится.',
      pointsTitle: 'Почему это выгодно и удобно',
      points: [
        'Защита от задержек: ремонт затягивается — техника бесплатно ждет вас на складе.',
        'Фиксация цены: покупайте выгодно сегодня, не боясь подорожания к концу ремонта.',
        'Свободное место: вам не придется захламлять квартиру или объект коробками.',
        'Безопасность: гарантируем полную сохранность оборудования на охраняемом складе.',
        'Доставка вовремя: привезем весь заказ в один день по первому вашему звонку.'
      ],
      icon: Warehouse
    }
  ];
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
      link: '/catalog/krupnaya-bytovaya-tehnika/stiralnye-i-sushilnye-mashiny',
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
      link: '/catalog/krupnaya-bytovaya-tehnika/stiralnye-i-sushilnye-mashiny/sushilnye-mashiny',
      img: dm
    },
    {
      title: 'Вытяжки',
      link: '/catalog/vytyazhki',
      img: hood
    }
  ];
  const kits = [
    {
      title: 'Варка + духовка',
      text: 'Базовый комплект для кухни',
      link: '/catalog/vstraivaemaya-tehnika/komplekty/komplekt-varka-duhovka',
      img: kit1
    },
    {
      title: 'Варка + духовка + СВЧ',
      text: 'Самый популярный набор',
      link: '/catalog/vstraivaemaya-tehnika/komplekty/komplekt-varka-duhovka-svch',
      img: kit2
    },
    {
      title: 'Варка + духовка + СВЧ + кофемашина',
      text: 'Для кухни с кофейной зоной',
      link: '/catalog/vstraivaemaya-tehnika/komplekty/komplekt-varka-duhovka-svch-kofemashina',
      img: kit3
    },
    {
      title: 'Варка + духовка + СВЧ + ПММ + холодильник',
      text: 'Готовое решение под ключ',
      link: '/catalog/vstraivaemaya-tehnika/komplekty/komplekt-varka-duhovka-svch-pmm-holodil',
      img: kit4
    }
  ];
</script>

<svelte:head>
  <title>Мультибренд Казань — интернет-магазин бытовой техники</title>
  <meta
    name="description"
    content="Интернет-магазин «Мультибренд» в Казани: встраиваемая и кухонная бытовая техника, вытяжки, мойки и смесители. Помощь в подборе под ваш интерьер. Доставка."
  />
</svelte:head>

<section class="hero-section mx-auto mt-0! overflow-hidden rounded-2xl">
  <div class="block lg:hidden">
    <Slider imgPaths={mobileImages} />
  </div>
  <div class="hidden lg:block">
    <Slider imgPaths={desktopImages} />
  </div>
</section>

<VideoSection />

<section class="mx-auto">
  <h2 class="section-title">Преимущества</h2>
  <div class="features-grid">
    {#each features as f}
      <div class="feature-card">
        <div class="feature-card__icon">
          <svelte:component this={f.icon} size={22} strokeWidth={2} />
        </div>
        <div class="feature-card__content">
          <h3>{f.title}</h3>
          {#if f.text}<p>{f.text}</p>{/if}
          {#if f.points}
            {#if f.pointsTitle}<h4>{f.pointsTitle}</h4>{/if}
            <ul>
              {#each f.points as point}
                <li>{point}</li>
              {/each}
            </ul>
          {/if}
        </div>
      </div>
    {/each}
  </div>
</section>

<section class="mx-auto">
  <h2 class="section-title">Популярные категории</h2>
  <div class="categories-grid">
    {#each categories as c}
      <a href={c.link} class="category-card">
        <span>{c.title}</span>
        <img src={c.img} alt="" loading="lazy" decoding="async" width="480" height="240" />
      </a>
    {/each}
  </div>
</section>

<section class="mx-auto">
  <div class="kits-block" style:--kit-color={kitColor}>
    <div class="kits-block__head">
      <div>
        <div class="kits-block__label">
          <Sparkles size={16} strokeWidth={2.4} />
          <span>Комплектом выгоднее</span>
        </div>
        <h2>Комплекты техники</h2>
        <p>Собрали популярные наборы для кухни, чтобы не подбирать технику по одной позиции.</p>
      </div>
      <a href="/catalog/vstraivaemaya-tehnika/komplekty" class="kits-block__all">
        Все комплекты
        <ArrowRight size={17} strokeWidth={2.2} />
      </a>
    </div>
    <div class="kits-grid">
      {#each kits as kit}
        <a href={kit.link} class="kit-card">
          <div class="kit-card__badge">%</div>
          <div class="kit-card__image">
            <img
              src={kit.img}
              alt={kit.title}
              loading="lazy"
              decoding="async"
              width="420"
              height="260"
            />
          </div>
          <div class="kit-card__content">
            <strong>{kit.title}</strong>
            <span>{kit.text}</span>
            <em>
              Смотреть комплект
              <ArrowRight size={15} strokeWidth={2.4} />
            </em>
          </div>
        </a>
      {/each}
    </div>
  </div>
</section>

<section class="mx-auto">
  <div class="promo-banner promo-banner--grandex">
    <div class="promo-banner__head">
      <div class="promo-banner__icon">
        <img src={grandexLogo} alt="Grandex Aqua" loading="lazy" />
      </div>
      <div class="promo-banner__text">
        <strong>Grandex Aqua</strong>
        <span>Бренд кухонных моек и смесителей с корнями в мире каменных столешниц. Созданы, чтобы служить рядом с камнем — эстетично, долго, безупречно.</span>
      </div>
    </div>
    <div class="promo-cards">
      <a href="/catalog/kuhonnye-moyki?brand=Grandex+Aqua" class="promo-card">
        <img class="promo-card__img" src={grandexMoiki} alt="Мойки Grandex Aqua" loading="lazy" />
        <span class="promo-card__name">Мойки</span>
      </a>
      <a href="/catalog/smesiteli?brand=Grandex+Aqua" class="promo-card">
        <img class="promo-card__img" src={grandexSmesiteli} alt="Смесители Grandex Aqua" loading="lazy" />
        <span class="promo-card__name">Смесители</span>
      </a>
    </div>
  </div>
</section>

<section class="mx-auto">
  <div class="promo-banner promo-banner--ac">
    <div class="promo-banner__head">
      <div class="promo-banner__icon">
        <Wind size={26} strokeWidth={2} />
      </div>
      <div class="promo-banner__text">
        <strong>Кондиционеры</strong>
        <span>Сплит-системы, инверторные и мобильные кондиционеры от проверенных брендов — Electrolux, Ballu, Toshiba и другие.</span>
      </div>
    </div>
    <div class="promo-cards">
      <a href="/catalog/klimaticheskaya-tehnika/kondicionery/split-sistemy-on-off" class="promo-card">
        <img class="promo-card__img" src={acSplit} alt="Сплит-система" loading="lazy" />
        <span class="promo-card__name">Сплит-системы</span>
      </a>
      <a href="/catalog/klimaticheskaya-tehnika/kondicionery/invertornye-split-sistemy" class="promo-card">
        <img class="promo-card__img" src={acInvertor} alt="Инверторная сплит-система" loading="lazy" />
        <span class="promo-card__name">Инверторные</span>
      </a>
      <a href="/catalog/klimaticheskaya-tehnika/kondicionery/mobilnye-kondicionery" class="promo-card">
        <img class="promo-card__img" src={acMobile} alt="Мобильный кондиционер" loading="lazy" />
        <span class="promo-card__name">Мобильные</span>
      </a>
    </div>
  </div>
</section>

<section class="mx-auto">
  <h2 class="section-title">Бренды</h2>
  <BrandsGrid />
</section>

<section class="mx-auto">
	<ReviewsSection />
</section>

<section class="about-seo mx-auto">
  <div class="about-seo__inner">
    <h2>Магазин бытовой техники «Мультибренд» в Казани</h2>
    <p>
      Добро пожаловать в интернет-магазин «Мультибренд» — ваше готовое решение для комплектации кухни и дома современной бытовой техникой в Казани. Мы собрали в одном каталоге продукцию ведущих мировых производителей, чтобы вы могли легко подобрать технику под любой интерьер, кухонный проект или готовый дизайн.
    </p>
    <p>
      В нашем ассортименте представлена как крупная, так и мелкая бытовая техника, встраиваемые духовые шкафы и варочные панели, современные кухонные вытяжки и климатические системы для создания идеального микроклимата.
    </p>
    <p>
      Мы уделяем особое внимание деталям, поэтому у нас вы найдете большой выбор кухонных моек, смесителей, измельчителей пищевых отходов (диспоузеров) и оригинальных запчастей к ним. Также мы поставляем профессиональную технику для бизнеса.
    </p>

    <h3>Почему выбирают «Мультибренд»?</h3>
    <ul>
      <li><strong>Индивидуальный подбор:</strong> Поможем подобрать технику под ваши задачи. Подскажем по точным размерам, брендам, цветам, совместимости и комплектации.</li>
      <li><strong>Шоурум в Казани:</strong> Вы можете оформить быструю доставку на сайте или посетить наш офлайн-магазин в Казани, чтобы вживую оценить качество товаров.</li>
      <li><strong>Официальная гарантия:</strong> Работаем только с проверенными брендами и гарантируем высокое качество каждого прибора.</li>
    </ul>
    <p>
      Оставьте заявку на сайте или свяжитесь с нами в Макс — эксперты «Мультибренд» помогут сделать вашу кухню функциональной, стильной и уютной!
    </p>
  </div>
</section>


<style lang="scss">
  .hero-section {
    margin-top: 0;
  }
  .section-title {
    margin: 0 0 16px;
    font-size: 1.75rem;
    font-weight: 800;
    line-height: 1.15;
    color: #111827;
  }
  .features-grid {
    display: grid;
    gap: 18px;
  }
  .features-grid {
    display: grid;
    gap: 18px;
    .feature-card {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      min-height: 100%;
      padding: 20px;
      border: 1px solid rgba($green, 0.1);
      border-radius: 16px;
      background: #fff;
      box-shadow: 0 8px 22px rgba(15, 23, 42, 0.06);
      .feature-card__icon {
        display: flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 42px;
        width: 42px;
        height: 42px;
        border-radius: 13px;
        background: rgba($yellow, 0.16);
        color: $green;
      }
      .feature-card__content {
        h3 {
          margin: 0;
          font-size: 1.05rem;
          font-weight: 800;
          line-height: 1.25;
          color: #111827;
        }
        p {
          margin: 8px 0 0;
          font-size: 0.92rem;
          line-height: 1.45;
          color: #475569;
        }
        h4 {
          margin: 12px 0 6px;
          font-size: 0.9rem;
          font-weight: 700;
          color: $green;
        }
        ul {
          margin: 10px 0 0;
          padding: 0;
          list-style: none;
          li {
            position: relative;
            padding-left: 18px;
            margin-bottom: 7px;
            font-size: 0.88rem;
            line-height: 1.4;
            color: #475569;
            &::before {
              content: '';
              position: absolute;
              top: 7px;
              left: 0;
              width: 6px;
              height: 6px;
              border-radius: 50%;
              background: $green;
            }
          }
        }
      }
    }
  }
  .categories-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 14px;
  }
  .category-card {
    display: flex;
    align-items: center;
    gap: 18px;
    min-height: 108px;
    padding: 14px 18px;
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
    span {
      order: 2;
      font-size: 1.02rem;
      font-weight: 800;
      line-height: 1.25;
    }
    img {
      order: 1;
      flex: 0 0 104px;
      width: 104px;
      height: 78px;
      object-fit: contain;
    }
    &:hover {
      transform: translateY(-2px);
      border-color: rgba($green, 0.22);
      box-shadow: 0 14px 28px rgba(15, 23, 42, 0.1);
    }
  }
  .kits-block {
    padding: 24px;
    border: 1px solid rgba(62, 111, 79, 0.12);
    border-radius: 20px;
    background: #fff;
    box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
  }
  .kits-block__head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 18px;
    margin-bottom: 24px;
    h2 {
      margin: 8px 0 0;
      font-size: 1.75rem;
      font-weight: 800;
      line-height: 1.15;
      color: #111827;
    }
    p {
      max-width: 620px;
      margin: 8px 0 0;
      font-size: 0.95rem;
      line-height: 1.45;
      color: #475569;
    }
  }
  .kits-block__label {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 7px 11px;
    border: 1px solid rgba(62, 111, 79, 0.16);
    border-radius: 999px;
    background: rgba(62, 111, 79, 0.06);
    color: var(--kit-color);
    font-size: 0.82rem;
    font-weight: 800;
  }
  .kits-block__all {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    flex: 0 0 auto;
    padding: 10px 14px;
    border: 1px solid rgba(62, 111, 79, 0.28);
    border-radius: 999px;
    background: #fff;
    color: var(--kit-color);
    font-size: 0.9rem;
    font-weight: 800;
    transition:
      transform 0.2s ease,
      background 0.2s ease,
      color 0.2s ease,
      box-shadow 0.2s ease;
    &:hover {
      transform: translateY(-2px);
      background: var(--kit-color);
      color: #fff;
      box-shadow: 0 10px 22px rgba(62, 111, 79, 0.18);
    }
  }
  .kits-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
  }
  .kit-card {
    position: relative;
    display: flex;
    flex-direction: column;
    min-height: 360px;
    overflow: hidden;
    border: 1px solid rgba(62, 111, 79, 0.12);
    border-radius: 18px;
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
    font-weight: 900;
    box-shadow: 0 10px 20px rgba(62, 111, 79, 0.22);
  }
  .kit-card__image {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 188px;
    padding: 28px 18px 10px;
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
    padding: 0 18px 18px;
    text-align: center;
    strong {
      max-width: 96%;
      margin: 0 auto;
      font-size: 1rem;
      font-weight: 850;
      line-height: 1.22;
      color: #111827;
    }
    span {
      max-width: 92%;
      margin: 10px auto 0;
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
      margin: auto -18px -18px;
      background: var(--kit-color);
      color: #fff;
      font-size: 0.88rem;
      font-style: normal;
      font-weight: 850;
      svg {
        flex: 0 0 auto;
        transition: transform 0.2s ease;
      }
    }
  }
  // ─── Promo banners (Grandex / AC) ───
  .promo-banner {
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 24px;
    border-radius: 20px;
    box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
  }
  .promo-banner--grandex {
    border: 1px solid rgba(62, 111, 79, 0.12);
    background: linear-gradient(135deg, rgba(62, 111, 79, 0.06), rgba(62, 111, 79, 0.02));
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
  .promo-banner--grandex .promo-banner__icon {
    background: rgba(62, 111, 79, 0.1);
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
      font-size: 1.35rem;
      font-weight: 850;
      line-height: 1.15;
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
    gap: 10px;
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
  .promo-banner--grandex .promo-card:hover {
    border-color: rgba(62, 111, 79, 0.3);
  }
  .promo-banner--ac .promo-card:hover {
    border-color: rgba(59, 130, 246, 0.3);
  }
  .promo-card__img {
    width: 100%;
    height: 120px;
    object-fit: contain;
    transition: transform 0.22s ease;
  }
  .promo-card__name {
    font-size: 0.95rem;
    font-weight: 800;
    text-align: center;
    color: #111827;
  }
  section {
    margin-top: 18px;
    margin-bottom: 18px;
  }
  @media (min-width: 640px) {
    .categories-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .kits-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .promo-cards {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  @media (max-width: 639px) {
    .section-title {
      margin-bottom: 14px;
      font-size: 1.45rem;
    }
    .promo-banner {
      padding: 18px;
      border-radius: 16px;
    }
    .promo-banner__head {
      justify-content: center;
    }
    .promo-banner__icon {
      width: 48px;
      height: 48px;
      border-radius: 14px;
    }
    .promo-banner__text {
      align-items: center;
      text-align: center;
      strong {
        font-size: 1.2rem;
      }
    }
    .promo-card__img {
      height: 100px;
    }
    .features-grid {
      gap: 12px;
    }
    .feature-card {
      padding: 16px;
    }
    .kits-block {
      padding: 16px;
      border-radius: 16px;
    }
    .kits-block__head {
      display: block;
      margin-bottom: 16px;
      h2 {
        font-size: 1.45rem;
      }
    }
    .kits-block__all {
      width: 100%;
      margin-top: 14px;
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
    .features-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    .categories-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    .kits-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
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
      border-radius: 20px;
      background: #fff;
    }
    h2 {
      margin: 0 0 16px;
      font-size: 1.6rem;
      font-weight: 800;
      line-height: 1.2;
      color: #111827;
    }
    h3 {
      margin: 24px 0 12px;
      font-size: 1.25rem;
      font-weight: 800;
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
        padding-left: 22px;
        margin-bottom: 10px;
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
