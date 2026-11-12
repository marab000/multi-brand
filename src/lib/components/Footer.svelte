<script lang="ts">
  import { ChevronDown, MapPin, ShieldCheck } from 'lucide-svelte';
  import { page } from '$app/stores';
  import { cityForms } from '$lib/cityForms';
  import tgIcon from '$lib/assets/social/tg.svg';
  import maxIcon from '$lib/assets/social/max.svg';
  import waIcon from '$lib/assets/social/whatsapp.svg';
  import {
    SITE_PHONE,
    SITE_PHONE_HREF,
    SITE_EMAIL,
    SITE_URL_NAME,
    LINK_TG,
    LINK_MAX,
    LINK_WHATSAPP
  } from '$lib/config/site';
  import type { Contacts } from '$lib/server/contacts';

  let { data }: { data: { catalogRoots?: { slug: string; name: string }[]; contacts?: Contacts | null } } = $props();
  const contacts = $derived(data?.contacts ?? null);
  const phone = $derived(contacts?.phone ?? SITE_PHONE);
  const phoneHref = $derived(contacts?.phoneHref ?? SITE_PHONE_HREF);
  const email = $derived(contacts?.email ?? SITE_EMAIL);
  const tgLink = $derived(contacts?.tgLink ?? LINK_TG);
  // текущий путь для переключателя городов (см. footer__cities)
  const currentPath = $derived($page.url.pathname);
  // активный город (номинатив) для подсветки в ряду городов
  const cityName = $derived(cityForms($page.data.city as string | undefined).nom);

  const year = new Date().getFullYear();

  // рассрочка: тот же банк-конфиг, что у карточки «Честная рассрочка» на главной
  const OTP_INSTALLMENT_URL = 'https://ecom.otpbank.ru/smart-form?config=eb7b4194-469a-400f-8cf1-f482869b7e1e';

  // «Популярные категории» по референсу футера: частый subset каталога
  const popularCategories: { name: string; href: string }[] = [
    { name: 'Духовые шкафы', href: '/catalog/vstraivaemaya-tehnika/duhovye-shkafy' },
    { name: 'Варочные панели', href: '/catalog/vstraivaemaya-tehnika/varochnye-poverhnosti' },
    { name: 'Кухонные вытяжки', href: '/catalog/vytyazhki' },
    { name: 'Микроволновые печи', href: '/catalog/mikrovolnovye-pechi' },
    { name: 'Стиральные машины', href: '/catalog/krupnaya-bytovaya-tehnika/stiralnye-i-sushilnye-mashiny/frontalnye-stiralnye-mashiny' },
    { name: 'Сушильные машины', href: '/catalog/krupnaya-bytovaya-tehnika/stiralnye-i-sushilnye-mashiny' },
    { name: 'Сушильные шкафы', href: '/catalog/krupnaya-bytovaya-tehnika/stiralnye-i-sushilnye-mashiny/sushilnye-shkafy' },
    { name: 'Холодильники', href: '/catalog/krupnaya-bytovaya-tehnika/holodilniki-i-morozilniki' },
    { name: 'Морозильные камеры', href: '/catalog/krupnaya-bytovaya-tehnika/holodilniki-i-morozilniki/morozilnye-kamery' },
    { name: 'Винные шкафы', href: '/catalog/vstraivaemaya-tehnika/vinnye-shkafy' },
    { name: 'Посудомоечные машины', href: '/catalog/vstraivaemaya-tehnika/posudomoechnye-mashiny' }
  ];

  // «Бренды» по референсу: слаг = имя в нижнем регистре (страницы брендов)
  const footerBrands = ['Asko', 'Liebherr', 'Korting', 'Kuppersberg', 'Franke', 'Smeg', 'Miele', 'Teka', 'Elica'];

  const buyerLinks: { name: string; href: string; external?: boolean }[] = [
    { name: 'Подбор комплекта', href: '/podbor' },
    { name: 'Хранение на складе M-7', href: '/podbor' },
    { name: 'Доставка', href: '/delivery' },
    { name: 'Рассрочка 0%', href: OTP_INSTALLMENT_URL, external: true },
    { name: 'Акции', href: '/sale' },
    { name: 'Корзина', href: '/cart' },
    { name: 'Избранное', href: '/favorites' },
    { name: 'Личный кабинет', href: '/user/info' },
    { name: 'Статьи', href: '/articles' },
    { name: 'О компании', href: '/about' }
  ];

  // аккордеоны колонок: на мобильных список свёрнут, на десктопе (≥640px) раскрыт всегда через CSS
  let openCategories = $state(false);
  let openBrands = $state(false);
  let openBuyers = $state(false);

  const cities = [
    { name: 'Казань', href: (p: string) => `https://multi-brand.online${p}` },
    { name: 'Москва', href: (p: string) => `https://msk.multi-brand.online${p}` },
    { name: 'Уфа', href: (p: string) => `https://ufa.multi-brand.online${p}` }
  ];
</script>

<footer class="footer">
  <div
    class="footer__inner mx-auto grid max-w-[1280px] grid-cols-1 gap-6 px-4 pb-5 pt-7 sm:grid-cols-2 sm:gap-6 sm:px-6 md:pb-7 md:pt-10 lg:grid-cols-[1.5fr_1.2fr_0.7fr_1fr] lg:gap-8"
  >
    <div class="footer__col footer__col--brand">
      <a class="footer__logo" href="/">{SITE_URL_NAME}</a>
      <p class="footer__about">
        Встраиваемая техника, крупная бытовая техника и аксессуары от официальных поставщиков.
      </p>
      <a class="footer__phone" href="tel:{phoneHref}">{phone}</a>
      <p class="footer__phone-note">Бесплатно по РФ, 9:00-21:00</p>
      <a class="footer__email" href="mailto:{email}">{email}</a>

      <div class="footer__addresses">
        <a
          href="https://yandex.ru/maps/?text=Казань, улица Чистопольская 66"
          target="_blank"
          rel="noopener"
        >
          Шоурум: ул. Чистопольская, 66
        </a>
        <a
          href="https://yandex.ru/maps/?text=Казань, Индустриальный парк M-7"
          target="_blank"
          rel="noopener"
        >
          Склад: Технопарк M-7
        </a>
      </div>

      <div class="footer__messengers">
        <a href={tgLink} target="_blank" rel="noopener noreferrer" aria-label="Telegram">
          <img src={tgIcon} alt="Telegram" />
        </a>
        <a href={LINK_MAX} target="_blank" rel="noopener noreferrer" aria-label="MAX">
          <img src={maxIcon} alt="MAX" />
        </a>
        <a href={LINK_WHATSAPP} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
          <img src={waIcon} alt="WhatsApp" />
        </a>
      </div>
    </div>

    <div class="footer__col">
      <h3 class="footer__title">
        <button type="button" class:open={openCategories} onclick={() => (openCategories = !openCategories)} aria-expanded={openCategories}>
          Популярные категории
          <ChevronDown size={16} strokeWidth={2.2} />
        </button>
      </h3>
      <ul class="footer__links" class:collapsed={!openCategories}>
        {#each popularCategories as cat (cat.href)}
          <li><a href={cat.href}>{cat.name}</a></li>
        {/each}
      </ul>
    </div>

    <div class="footer__col">
      <h3 class="footer__title">
        <button type="button" class:open={openBrands} onclick={() => (openBrands = !openBrands)} aria-expanded={openBrands}>
          Бренды
          <ChevronDown size={16} strokeWidth={2.2} />
        </button>
      </h3>
      <ul class="footer__links" class:collapsed={!openBrands}>
        {#each footerBrands as brand (brand)}
          <li><a href="/brands/{brand.toLowerCase()}">{brand}</a></li>
        {/each}
      </ul>
    </div>

    <div class="footer__col">
      <h3 class="footer__title">
        <button type="button" class:open={openBuyers} onclick={() => (openBuyers = !openBuyers)} aria-expanded={openBuyers}>
          Покупателям
          <ChevronDown size={16} strokeWidth={2.2} />
        </button>
      </h3>
      <ul class="footer__links" class:collapsed={!openBuyers}>
        {#each buyerLinks as link (link.name)}
          <li>
            <a
              href={link.href}
              target={link.external ? '_blank' : undefined}
              rel={link.external ? 'noopener noreferrer' : undefined}
            >{link.name}</a>
          </li>
        {/each}
      </ul>
    </div>
  </div>

  <div class="footer__bottom mx-auto max-w-[1280px] px-4 pb-[calc(66px+env(safe-area-inset-bottom,0px))] sm:px-6 md:pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
    <!-- дисклеймер + юр-ссылки одной строкой, справа линия-заполнитель (референс) -->
    <p class="footer__disclaimer">
      Вся представленная на сайте информация носит информационный характер и не является публичной
      офертой. Точную информацию о товарах уточняйте у наших специалистов.
    </p>
    <div class="footer__legal">
      <a href="/privacy">Политика обработки персональных данных</a>
      <span class="footer__legal-sep" aria-hidden="true">|</span>
      <a href="/offer">Договор оферты</a>
      <span class="footer__legal-sep" aria-hidden="true">|</span>
      <a href="/garantiya">Гарантия</a>
      <i class="footer__legal-line" aria-hidden="true"></i>
    </div>

    <div class="footer__meta">
      <div class="footer__copy">
        <p>© {year} {SITE_URL_NAME}</p>
        <p class="footer__inn">ИНН 1685389560</p>
      </div>
      <!-- перелинковка региональных поддоменов (до включения DNS ссылки ведут на основной домен) -->
      <div class="footer__cities">
        {#each cities as c (c.name)}
          <a
            href={c.href(currentPath)}
            class:active={c.name === cityName}
            target={c.name === cityName ? undefined : '_blank'}
            rel={c.name === cityName ? undefined : 'noopener'}
          >
            {#if c.name === cityName}<MapPin size={13} strokeWidth={2.1} />{/if}
            {c.name}
          </a>
        {/each}
      </div>
      <div class="footer__badge">
        <ShieldCheck size={20} strokeWidth={1.8} />
        <span>Официальная<br />гарантия до 5 лет</span>
      </div>
    </div>
  </div>
</footer>

<style lang="scss">
  .footer {
    // тёмно-зелёное «стекло» вместо прежнего navy + мягкие блики (референс)
    position: relative;
    overflow: hidden;
    background:
      radial-gradient(60% 90% at 8% 12%, rgba(52, 110, 78, 0.28), transparent 60%),
      radial-gradient(50% 70% at 96% 84%, rgba(52, 110, 78, 0.2), transparent 60%),
      linear-gradient(180deg, #0e2f1e 0%, #0a2417 100%);
    color: #cbd5e1;

    // «звёздочки» (референс): россыпь мелких светящихся точек по углам —
    // чистый CSS, фото-подложка не нужна
    &::before {
      content: '';
      position: absolute;
      inset: 0;
      pointer-events: none;
      background-image:
        radial-gradient(circle at 6% 14%, rgba(255, 255, 255, 0.6) 0 1px, transparent 1.8px),
        radial-gradient(circle at 14% 34%, rgba(143, 214, 162, 0.55) 0 1px, transparent 1.8px),
        radial-gradient(circle at 24% 8%, rgba(255, 255, 255, 0.4) 0 1px, transparent 1.8px),
        radial-gradient(circle at 31% 22%, rgba(255, 255, 255, 0.3) 0 1px, transparent 1.8px),
        radial-gradient(circle at 11% 55%, rgba(143, 214, 162, 0.35) 0 1px, transparent 1.8px),
        radial-gradient(circle at 19% 68%, rgba(255, 255, 255, 0.25) 0 1px, transparent 1.8px),
        radial-gradient(circle at 4% 44%, rgba(255, 255, 255, 0.35) 0 1px, transparent 1.8px),
        radial-gradient(circle at 94% 62%, rgba(255, 255, 255, 0.5) 0 1px, transparent 1.8px),
        radial-gradient(circle at 87% 78%, rgba(143, 214, 162, 0.5) 0 1px, transparent 1.8px),
        radial-gradient(circle at 96% 42%, rgba(255, 255, 255, 0.35) 0 1px, transparent 1.8px),
        radial-gradient(circle at 78% 88%, rgba(255, 255, 255, 0.4) 0 1px, transparent 1.8px),
        radial-gradient(circle at 68% 94%, rgba(143, 214, 162, 0.35) 0 1px, transparent 1.8px),
        // пара «крупных» звёзд с лёгким ореолом
        radial-gradient(circle at 9% 26%, rgba(220, 245, 228, 0.35) 0 2.5px, transparent 6px),
        radial-gradient(circle at 91% 70%, rgba(220, 245, 228, 0.3) 0 2.5px, transparent 6px);
    }

    // «листики» по углам убраны по решению заказчика — остались только звёздочки

    // контент — над слоями декора
    .footer__inner,
    .footer__bottom {
      position: relative;
      z-index: 1;
    }

    &__col {
      min-width: 0;
    }

    &__col--brand {
      max-width: 360px;
    }

    // вертикальные разделители между колонками (референс) — на десктопной
    // 4-колоночной сетке; на планшете/мобиле сетка 2/1 колонки и границы не нужны.
    // Линия со свечением: псевдоэлемент вместо border — border не подсветить;
    // градиент гаснет к краям, мягкий ореол вокруг
    @media (min-width: 1024px) {
      &__col + &__col {
        position: relative;
        padding-left: $sp-6;

        &::before {
          content: '';
          position: absolute;
          top: 0;
          bottom: 0;
          left: 0;
          width: 1px;
          background: linear-gradient(
            180deg,
            transparent,
            rgba(143, 214, 162, 0.4) 16%,
            rgba(255, 255, 255, 0.22) 50%,
            rgba(143, 214, 162, 0.4) 84%,
            transparent
          );
          box-shadow: 0 0 14px rgba(143, 214, 162, 0.28);
        }
      }
    }

    &__logo {
      font-size: 1.4rem;
      font-weight: 600;
      color: #e8f0ea;
      text-decoration: none;
      letter-spacing: -0.02em;
    }

    &__about {
      margin: $sp-3 0 0;
      max-width: 320px;
      font-size: 0.8125rem;
      line-height: 1.55;
      color: #9db5a6;
    }

    &__phone {
      display: inline-block;
      margin-top: $sp-4;
      color: #fff;
      font-size: 1.35rem;
      font-weight: 600;
      letter-spacing: 0.01em;
      text-decoration: none;
      &:hover {
        color: $yellow;
      }
    }

    &__phone-note {
      margin: 2px 0 0;
      font-size: 0.75rem;
      color: #7e9a87;
    }

    &__email {
      display: inline-block;
      margin-top: $sp-3;
      font-size: 0.8125rem;
      color: #cbd5e1;
      text-decoration: none;
      &:hover {
        color: #fff;
      }
    }

    &__addresses {
      display: flex;
      flex-direction: column;
      gap: $sp-1;
      margin-top: $sp-3;
      a {
        font-size: 0.8125rem;
        line-height: 1.4;
        color: #9db5a6;
        text-decoration: none;
        &:hover {
          color: #fff;
        }
      }
    }

    &__messengers {
      display: flex;
      gap: $sp-2;
      margin-top: $sp-4;

      // круглые кнопки мессенджеров (референс)
      a {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 38px;
        height: 38px;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.07);
        transition: background 0.15s;

        img {
          width: 20px;
          height: 20px;
        }
        &:hover {
          background: rgba(255, 255, 255, 0.16);
        }
      }
    }

    &__title {
      font-size: 1rem;
      font-weight: 600;
      color: #fff;
      margin: 0 0 $sp-3;

      button {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        padding: 0;
        border: 0;
        background: none;
        color: inherit;
        font: inherit;
        text-align: left;
        cursor: pointer;

        :global(svg) {
          color: #7e9a87;
          transition: transform 0.2s ease;
        }

        &.open :global(svg) {
          transform: rotate(180deg);
        }
      }
    }

    &__links {
      animation: drop-in 0.15s ease;
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: $sp-2;

      a {
        font-size: 0.875rem;
        color: #b3c6ba;
        text-decoration: none;
        transition: color 0.15s ease;

        &:hover {
          color: #fff;
        }
      }
    }

    // на мобильных списки колонок свёрнуты, разворачиваются тапом по заголовку
    &__links.collapsed {
      display: none;
    }

    @media (min-width: 640px) {
      &__title button {
        cursor: default;

        :global(svg) {
          display: none;
        }
      }

      &__links.collapsed {
        display: flex;
      }
    }

    &__bottom {
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      padding-top: $sp-3;
    }

    &__disclaimer {
      margin: 0;
      max-width: 1100px;
      font-size: 0.6875rem;
      line-height: 1.5;
      color: #7e9a87;
    }

    &__legal {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: $sp-1 $sp-2;
      margin-top: $sp-1;

      a {
        font-size: 0.75rem;
        color: #9db5a6;
        text-decoration: none;
        white-space: nowrap;
        &:hover {
          color: $yellow;
        }
      }
    }

    // линия-заполнитель справа от юр-ссылок: со свечением вокруг, как в референсе
    &__legal-line {
      flex: 1;
      min-width: 60px;
      height: 1px;
      background: linear-gradient(90deg, rgba(143, 214, 162, 0.45), rgba(255, 255, 255, 0.25));
      box-shadow: 0 0 10px rgba(143, 214, 162, 0.35);
    }

    &__legal-sep {
      color: #4f6b5a;
    }

    &__meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: $sp-3 $sp-6;
      margin-top: $sp-4;
    }

    &__copy {
      p {
        margin: 0;
        font-size: 0.8125rem;
        color: #cbd5e1;
      }
    }

    &__inn {
      margin-top: 2px !important;
      font-size: 0.75rem !important;
      color: #7e9a87 !important;
    }

    &__cities {
      display: flex;
      align-items: center;
      gap: $sp-4;

      a {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 0.8125rem;
        color: #7e9a87;
        text-decoration: none;
        &:hover {
          color: #fff;
        }
        // текущий город подсвечен (пин + белый)
        &.active {
          color: #fff;
          font-weight: 600;
          :global(svg) {
            color: $yellow;
          }
        }
      }
    }

    // бейдж «Официальная гарантия до 5 лет» (референс, справа внизу)
    &__badge {
      display: inline-flex;
      align-items: center;
      gap: $sp-2;
      padding: 8px 14px;
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.06);
      font-size: 0.72rem;
      line-height: 1.3;
      color: #cbd5e1;

      :global(svg) {
        color: #8fd6a2;
        flex-shrink: 0;
      }
    }
  }
</style>
