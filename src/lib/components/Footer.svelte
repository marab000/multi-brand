<script lang="ts">
  import { Phone, Mail, MapPin, ChevronDown } from 'lucide-svelte';
  import { page } from '$app/stores';
  import tgIcon from '$lib/assets/social/tg.svg';
  import maxIcon from '$lib/assets/social/max.svg';
  import {
    SITE_PHONE,
    SITE_PHONE_HREF,
    SITE_EMAIL,
    SITE_URL_NAME,
    LINK_TG,
    LINK_MAX
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
  const maxLink = $derived(contacts?.maxLink ?? LINK_MAX);

  const year = new Date().getFullYear();

  // аккордеоны колонок: на мобильных список свёрнут, на десктопе (≥640px) раскрыт всегда через CSS
  let openCatalog = $state(false);
  let openBuyers = $state(false);
  let openCompany = $state(false);
</script>

<footer class="footer">
  <div
    class="footer__inner mx-auto grid max-w-[1280px] grid-cols-1 gap-6 px-4 pb-5 pt-7 sm:grid-cols-2 sm:gap-6 sm:px-6 md:pb-7 md:pt-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:gap-8"
  >
    <div class="footer__col footer__col--brand">
      <a class="footer__logo" href="/">{SITE_URL_NAME}</a>
      <p class="footer__about">
        Интернет-магазин бытовой техники в Казани. Встраиваемая техника, крупная бытовая техника и
        аксессуары от официальных поставщиков.
      </p>
      <div class="footer__contacts">
        <a class="footer__contact" href="tel:{phoneHref}">
          <Phone size={16} strokeWidth={2.1} />
          <span>{phone}</span>
        </a>
        <a class="footer__contact" href="mailto:{email}">
          <Mail size={16} strokeWidth={2.1} />
          <span>{email}</span>
        </a>
        <a
          class="footer__contact"
          href="https://yandex.ru/maps/?text=Казань, улица Чистопольская 66"
          target="_blank"
          rel="noopener"
        >
          <MapPin size={16} strokeWidth={2.1} />
          <span>г. Казань, ул. Чистопольская, 66 (офлайн-магазин)</span>
        </a>
        <a
          class="footer__contact"
          href="https://yandex.ru/maps/?text=Казань, Индустриальный парк M-7"
          target="_blank"
          rel="noopener"
        >
          <MapPin size={16} strokeWidth={2.1} />
          <span>Склад: Промышленная площадка, Индустриальный парк M-7</span>
        </a>
      </div>

      <div class="footer__messengers">
        <a href={LINK_TG} target="_blank" rel="noopener noreferrer" aria-label="Telegram">
          <img src={tgIcon} alt="Telegram" />
        </a>
        <a href={LINK_MAX} target="_blank" rel="noopener noreferrer" aria-label="MAX">
          <img src={maxIcon} alt="MAX" />
        </a>
      </div>
    </div>

    <div class="footer__col">
      <h3 class="footer__title">
        <button type="button" class:open={openCatalog} onclick={() => (openCatalog = !openCatalog)} aria-expanded={openCatalog}>
          Каталог
          <ChevronDown size={16} strokeWidth={2.2} />
        </button>
      </h3>
      <ul class="footer__links" class:collapsed={!openCatalog}>
        {#if data.catalogRoots?.length}
          {#each data.catalogRoots as root (root.slug)}
            <li><a href="/catalog/{root.slug}">{root.name}</a></li>
          {/each}
        {:else}
          <li><a href="/catalog">Весь каталог</a></li>
        {/if}
        <li><a href="/catalog">Все товары</a></li>
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
        <li><a href="/sale">Акции</a></li>
        <li><a href="/delivery">Доставка</a></li>
        <li><a href="/podbor">Собери комплект техники 🔥</a></li>
        <li><a href="/cart">Корзина</a></li>
        <li><a href="/favorites">Избранное</a></li>
        <li><a href="/user/info">Личный кабинет</a></li>
      </ul>
    </div>

    <div class="footer__col">
      <h3 class="footer__title">
        <button type="button" class:open={openCompany} onclick={() => (openCompany = !openCompany)} aria-expanded={openCompany}>
          Компания
          <ChevronDown size={16} strokeWidth={2.2} />
        </button>
      </h3>
      <ul class="footer__links" class:collapsed={!openCompany}>
        <li><a href="/about">О компании</a></li>
        <li><a href="/articles">Статьи</a></li>
      </ul>
    </div>
  </div>

  <div class="footer__bottom mx-auto flex max-w-[1280px] flex-col gap-1.5 border-t border-white/10 px-4 py-3.5 pb-[calc(66px+env(safe-area-inset-bottom,0px))] text-center sm:px-6 md:pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] md:text-left">
    <p>© {year} MULTIBRAND — интернет-магазин бытовой техники в Казани</p>
    <p class="footer__requisites">ИНН 165123360719 · ОГРНИП 325169000035393</p>
    <!-- перелинковка региональных поддоменов (до включения DNS ссылки ведут на основной домен) -->
    <p class="footer__cities flex flex-wrap justify-center gap-x-4 gap-y-1 md:justify-start">
      <span>Вы в Казани:</span>
      <a href="https://multi-brand.online{currentPath}">Казань</a>
      <a href="https://msk.multi-brand.online{currentPath}">Москва</a>
      <a href="https://ufa.multi-brand.online{currentPath}">Уфа</a>
    </p>
    <p class="footer__legal-links flex flex-wrap justify-center gap-x-4 gap-y-1 md:justify-start">
      <a href="/privacy">Политика обработки персональных данных</a>
      <a href="/offer">Договор оферты</a>
      <a href="/garantiya">Гарантия</a>
    </p>
    <p class="footer__disclaimer">
      Вся представленная на сайте информация носит информационный характер и не является публичной
      офертой. Точную информацию о товарах уточняйте у наших специалистов.
    </p>
  </div>
</footer>

<style lang="scss">
  .footer {
    background: #1e293b;
    color: #cbd5e1;

    &__col--brand {
      max-width: 340px;
    }

    &__logo {
      font-size: 1.25rem;
      font-weight: 700;
      color: #fff;
      text-decoration: none;
      letter-spacing: -0.02em;
    }

    &__about {
      margin-top: $sp-3;
      font-size: 0.8125rem;
      line-height: 1.55;
      color: #94a3b8;
    }

    &__contacts {
      margin-top: $sp-4;
      display: flex;
      flex-direction: column;
      gap: $sp-2;
    }

    &__contact {
      display: inline-flex;
      align-items: center;
      gap: $sp-2;
      font-size: 0.8125rem;
      font-weight: 600;
      color: #cbd5e1;
      text-decoration: none;

      :global(svg) {
        color: $yellow;
        flex-shrink: 0;
      }

      &:hover {
        color: #fff;
      }
    }

    &__title {
      font-size: 0.875rem;
      font-weight: 700;
      color: #fff;
      margin: 0 0 $sp-3;
      text-transform: uppercase;
      letter-spacing: 0.04em;

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
        letter-spacing: inherit;
        text-transform: inherit;
        text-align: left;
        cursor: pointer;

        :global(svg) {
          color: #94a3b8;
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
        font-size: 0.8125rem;
        color: #94a3b8;
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
      p {
        margin: 0;
        font-size: 0.75rem;
        color: #94a3b8;
      }
    }

    &__disclaimer {
      max-width: 900px;
      font-size: 0.6875rem !important;
      line-height: 1.5;
      color: #64748b !important;
    }

    &__messengers {
      display: flex;
      gap: $sp-3;
      margin-top: $sp-3;

      a {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 38px;
        height: 38px;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.08);
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

    &__legal-links a {
      font-size: 0.75rem;
      color: #94a3b8;
      text-decoration: underline;
      text-underline-offset: 2px;
      &:hover {
        color: $yellow;
      }
    }

    &__cities {
      font-size: 0.75rem;
      color: #94a3b8;
      a {
        color: #cbd5e1;
        text-decoration: underline;
        text-underline-offset: 2px;
        &:hover {
          color: $yellow;
        }
      }
    }
  }
</style>
