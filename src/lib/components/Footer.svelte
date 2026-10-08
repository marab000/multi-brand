<script lang="ts">
  import { Phone, Mail, MapPin } from 'lucide-svelte';
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
  const maxLink = $derived(contacts?.maxLink ?? LINK_MAX);

  const year = new Date().getFullYear();
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
      <h4 class="footer__title">Каталог</h4>
      <ul class="footer__links">
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
      <h4 class="footer__title">Покупателям</h4>
      <ul class="footer__links">
        <li><a href="/delivery">Доставка</a></li>
        <li><a href="/podbor">Собери комплект техники 🔥</a></li>
        <li><a href="/cart">Корзина</a></li>
        <li><a href="/favorites">Избранное</a></li>
        <li><a href="/user/info">Личный кабинет</a></li>
      </ul>
    </div>

    <div class="footer__col">
      <h4 class="footer__title">Компания</h4>
      <ul class="footer__links">
        <li><a href="/about">О компании</a></li>
        <li><a href="/articles">Статьи</a></li>
        <li><a href="/contacts">Контакты</a></li>
      </ul>
    </div>
  </div>

  <div class="footer__bottom mx-auto flex max-w-[1280px] flex-col gap-1.5 border-t border-white/10 px-4 py-3.5 pb-[calc(66px+env(safe-area-inset-bottom,0px))] text-center sm:px-6 md:pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] md:text-left">
    <p>© {year} MULTIBRAND — интернет-магазин бытовой техники в Казани</p>
    <p class="footer__requisites">ИНН 165123360719 · ОГРНИП 325169000035393</p>
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
      font-size: 20px;
      font-weight: 800;
      color: #fff;
      text-decoration: none;
      letter-spacing: -0.02em;
    }

    &__about {
      margin-top: 10px;
      font-size: 13px;
      line-height: 1.55;
      color: #94a3b8;
    }

    &__contacts {
      margin-top: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    &__contact {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 13.5px;
      font-weight: 600;
      color: #e2e8f0;
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
      font-size: 14px;
      font-weight: 700;
      color: #fff;
      margin: 0 0 12px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    &__links {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;

      a {
        font-size: 13.5px;
        color: #94a3b8;
        text-decoration: none;
        transition: color 0.15s ease;

        &:hover {
          color: #fff;
        }
      }
    }


    &__bottom {
      p {
        margin: 0;
        font-size: 12.5px;
        color: #94a3b8;
      }
    }

    &__disclaimer {
      max-width: 900px;
      font-size: 11.5px !important;
      line-height: 1.5;
      color: #64748b !important;
    }

    &__messengers {
      display: flex;
      gap: 10px;
      margin-top: 12px;

      a {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 38px;
        height: 38px;
        border-radius: 10px;
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
      font-size: 12px;
      color: #94a3b8;
      text-decoration: underline;
      text-underline-offset: 2px;
      &:hover {
        color: $yellow;
      }
    }
  }
</style>
