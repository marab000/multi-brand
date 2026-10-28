<script lang="ts">
  import ProductSearch from '$lib/components/ProductSearch.svelte';
  import AuthModal from '$lib/components/AuthModal.svelte';
  import { openAuthModal } from '$lib/stores/authModal.svelte';
  import LeadRequestModal from '$lib/components/LeadRequestModal.svelte';
  import Drawer from '$lib/components/Drawer.svelte';
  import { backHref } from '$lib/stores/backHref';
  import logo1 from '$lib/assets/logo1.png';
  import tgIcon from '$lib/assets/social/tg.svg';
  import maxIcon from '$lib/assets/social/max.svg';
  import { cart } from '$lib/stores/cart';
  import { favorites } from '$lib/stores/favorites';
  import { derived } from 'svelte/store';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import {
    Menu,
    Send,
    ShoppingCart,
    Heart,
    User,
    CircleUserRound,
    X,
    Phone,
    Truck,
    MessageCircleMore,
    Building2,
    Sparkles,
    BadgePercent,
    ChevronDown,
    ChevronUp,
    ArrowLeft,
    ArrowRight
  } from 'lucide-svelte';
  import { slide } from 'svelte/transition';
  import { toast } from 'svelte-sonner';
  import { scrollUi, initScrollDirection } from '$lib/utils/scrollDirection.svelte';
  import { SITE_PHONE, SITE_PHONE_HREF, LINK_TG, LINK_MAX } from '$lib/config/site';
  import type { Contacts } from '$lib/server/contacts';
  type CatalogLeaf = { slug: string; name: string; productTypes: string[] };
  type CatalogGroup = {
    slug: string;
    name: string;
    categories: string[];
    leaves: CatalogLeaf[];
    isDefault?: boolean;
  };
  type CatalogRoot = { slug: string; name: string; groups: CatalogGroup[] };
  type AuthUser = {
    id: string;
    email: string;
    phone: string | null;
    full_name: string;
    email_verified: boolean;
  };
  type CatalogMenuRoot = {
    slug: string;
    name: string;
    href: string;
    count: number;
    groups: {
      slug: string;
      name: string;
      href: string;
      leaves: { title: string; href: string }[];
    }[];
  };
  type CatalogParent = { slug: string; name: string; items: CatalogMenuRoot[] };
  const slideTransition = { duration: 220, easing: (t: number) => t * (2 - t) };
  let { data } = $props<{
    data?: {
      catalogRoots?: CatalogRoot[];
      rootCounts?: Record<string, number>;
      user?: AuthUser | null;
      contacts?: Contacts | null;
      searchHints?: string[];
    };
  }>();
  const contacts = $derived(data?.contacts ?? null);
  const searchHints = $derived(data?.searchHints ?? []);
  const phoneNumber = $derived(contacts?.phone ?? SITE_PHONE);
  const phoneHref = $derived(contacts?.phoneHref ?? SITE_PHONE_HREF);
  const tgLink = $derived(contacts?.tgLink ?? LINK_TG);
  const maxLink = $derived(contacts?.maxLink ?? LINK_MAX);
  let open = $state(false);
  let menuOpen = $state(false);
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let isMobile = $state(false);
  let pathname = $state('');
  let showSearch = $state(false);
  // на мобилке при фокусе на поиск каталог прячется — инпут на всю ширину
  let searchExpanded = $state(false);
  let openRootSlug = $state<string | null>(null);
  let authOpen = $state(false);
  let authMode = $state<'login' | 'register'>('login');
  // Мост из других компонентов: openAuthModal() диспатчит window-событие
  const handleExternalAuth = (e: Event) => {
    authMode = (e as CustomEvent).detail?.mode === 'register' ? 'register' : 'login';
    authOpen = true;
  };
  onMount(() => {
    initScrollDirection();
    window.addEventListener('open-auth-modal', handleExternalAuth);
    window.addEventListener('open-catalog-menu', handleExternalCatalog);
    window.addEventListener('open-menu-drawer', handleExternalMenu);
    return () => {
      window.removeEventListener('open-auth-modal', handleExternalAuth);
      window.removeEventListener('open-catalog-menu', handleExternalCatalog);
      window.removeEventListener('open-menu-drawer', handleExternalMenu);
    };
  });
  const handleExternalMenu = () => {
    // тап «Меню» — переключатель: повторный тап закрывает; меню и каталог взаимоисключающие
    menuOpen = !menuOpen;
    if (menuOpen && open) closeCatalog();
  };
  // Мост из BottomNav: тап «Каталог» открывает боковой каталог, повторный — закрывает
  const handleExternalCatalog = () => {
    if (isMobile) toggleClick();
  };
  function closeMenuDrawer() {
    menuOpen = false;
  }
  // «Профиль» для гостя: /user/* кидает на главную с ?auth=login — открываем вход
  $effect(() => {
    if (user) return;
    if ($page.url.searchParams.get('auth') === 'login') {
      handleExternalAuth(new CustomEvent('open-auth-modal', { detail: { mode: 'login' } }));
      const url = new URL(window.location.href);
      url.searchParams.delete('auth');
      window.history.replaceState({}, '', url.pathname + url.search);
    }
  });
  let userMenuOpen = $state(false);
  let requestOpen = $state(false);
  const count = derived(cart, ($c) => $c.reduce((sum, i) => sum + i.qty, 0));
  const favCount = derived(favorites, ($f) => $f.length);
  // «Каталог» в шапке мобилки превращается в «назад», когда пользователь
  // углубился в каталог (категория/подкатегория/поиск/товар). Цель — родительский
  // уровень; на товаре — категория товара (её сообщает страница через store).
  const headerBack = $derived.by(() => {
    if (!isMobile) return null;
    const path = $page.url.pathname;
    if (path === '/' || path === '/catalog') return null;
    if (path.startsWith('/products/')) {
      return { href: $backHref ?? '/catalog' };
    }
    if (path.startsWith('/catalog/')) {
      return { href: path.replace(/\/[^/]+$/, '') || '/catalog' };
    }
    return null;
  });
  const catalogRoots = $derived((data?.catalogRoots ?? []) as CatalogRoot[]);
  const rootCounts = $derived((data?.rootCounts ?? {}) as Record<string, number>);
  const user = $derived(data?.user ?? null);
  function buildRoot(root: CatalogRoot): CatalogMenuRoot | null {
    const groups = root.groups
      .filter((group) => !group.isDefault)
      .map((group) => ({
        slug: group.slug,
        name: group.name,
        href: `/catalog/${root.slug}/${group.slug}`,
        leaves: group.leaves
          .map((leaf) => ({
            title: leaf.name,
            href: `/catalog/${root.slug}/${group.slug}/${leaf.slug}`
          }))
          .filter((leaf) => leaf.title && leaf.href)
      }))
      .filter((group) => group.leaves.length > 0);
    if (!groups.length) return null;
    return {
      slug: root.slug,
      name: root.name,
      href: `/catalog/${root.slug}`,
      count: rootCounts[root.slug.trim().toLowerCase()] ?? 0,
      groups
    };
  }
  const catalogParents = $derived.by(() => {
    const menuRoots = catalogRoots.map(buildRoot).filter(Boolean) as CatalogMenuRoot[];
    const groups: CatalogParent[] = [
      {
        slug: 'bytovaya-tehnika',
        name: 'Бытовая техника',
        items: menuRoots.filter((root) =>
          [
            'Встраиваемая техника',
            'Кухонные вытяжки',
            'Крупная бытовая техника',
            'Мелкая бытовая техника',
            'Климатическая техника',
            'Запчасти и аксессуары для техники'
          ].includes(root.name)
        )
      },
      {
        slug: 'moyki-smesiteli-musornye-sistemy',
        name: 'Мойки, смесители, мусорные системы и аксессуары',
        items: menuRoots.filter((root) =>
          [
            'Запчасти для моек, смесителей, измельчителей и мусорных систем',
            'Кухонные мойки',
            'Смесители',
            'Измельчители пищевых отходов'
          ].includes(root.name)
        )
      },
      {
        slug: 'professionalnaya tehnika',
        name: 'Профессиональная техника',
        items: menuRoots.filter((root) => root.name === 'Профессиональная техника')
      }
    ];
    return groups.filter((group) => group.items.length > 0);
  });
  $effect(() => {
    pathname = $page.url.pathname;
    showSearch =
      pathname === '/' || pathname.startsWith('/catalog') || pathname.startsWith('/products');
    // любая навигация закрывает каталог и меню: шапка не перемонтируется,
    // и без этого открытый дропдаун/дровер переезжают на новую страницу
    open = false;
    menuOpen = false;
  });
  function syncMobile() {
    isMobile = window.innerWidth < 1024;
  }
  onMount(() => {
    syncMobile();
    window.addEventListener('resize', syncMobile);
    return () => window.removeEventListener('resize', syncMobile);
  });
  // ВАЖНО: открытая категория (openRootSlug) нигде не сбрасывается —
  // меню «помнит» место: закрыл и снова открыл — ты там же, где был (вариант C)
  function openMenu() {
    if (isMobile) return;
    clearTimeout(timeout);
    open = true;
  }
  function closeMenu() {
    if (isMobile) return;
    timeout = setTimeout(() => {
      open = false;
    }, 160);
  }
  function toggleClick() {
    if (!isMobile) return;
    open = !open;
    if (open) menuOpen = false; // каталог и правое меню не сосуществуют
  }
  function closeCatalog() {
    open = false;
  }
  function toggleRoot(rootSlug: string) {
    openRootSlug = openRootSlug === rootSlug ? null : rootSlug;
  }
  function openRequestModal() {
    requestOpen = true;
  }
  function handleUserClick() {
    if (!user) {
      openAuthModal('login');
      return;
    }
    userMenuOpen = !userMenuOpen;
  }
  async function logout() {
    const res = await fetch('/api/auth/logout', { method: 'POST' });
    if (!res.ok) {
      toast.error('Не удалось выйти');
      return;
    }
    toast.success('Вы вышли');
    location.reload();
  }
</script>

{#snippet catalogTree()}
  <div class="catalog-tree">
    {#each catalogParents as parent}
      <section class="tree-parent">
        <div class="tree-parent__head"><p class="tree-parent__title">{parent.name}</p></div>
        <div class="tree-parent__accordion">
          {#each parent.items as root}
            <article class="acc-cat" class:acc-cat--open={openRootSlug === root.slug}>
              <button
                type="button"
                class="acc-cat__row"
                onclick={() => toggleRoot(root.slug)}
                aria-expanded={openRootSlug === root.slug ? 'true' : 'false'}
              >
                <span class="acc-cat__name">{root.name}</span>
                <span class="acc-cat__meta">
                  {#if root.count > 0}<span class="acc-cat__count">{root.count}</span>{/if}
                  {#if openRootSlug === root.slug}
                    <ChevronUp size={18} strokeWidth={2.2} />
                  {:else}
                    <ChevronDown size={18} strokeWidth={2.2} />
                  {/if}
                </span>
              </button>
              {#if openRootSlug === root.slug && root.groups.length > 0}
                <div class="acc-cat__card" transition:slide={slideTransition}>
                  <div class="acc-cat__chips">
                    {#each root.groups as group}
                      <a class="acc-cat__chip" href={group.href}>{group.name}</a>
                    {/each}
                  </div>
                  <a class="acc-cat__all" href={root.href}
                    >Смотреть все в «{root.name}» <ArrowRight size={14} strokeWidth={2.4} /></a
                  >
                </div>
              {/if}
            </article>
          {/each}
        </div>
      </section>
    {/each}
  </div>
{/snippet}

<div class="nav container mx-auto px-3 sm:px-4">
  <div
    class="nav__top flex min-h-15 flex-col gap-1.5 border-b border-black/5 py-2 md:min-h-11 md:flex-row md:items-center md:justify-between md:gap-4 md:py-0"
  >
    <div class="flex w-full items-center justify-between gap-3 md:hidden">
      <a class="nav__logo flex h-9 w-20 shrink-0" href="/"
        ><img class="object-contain" src={logo1} alt="logo" /></a
      >
      <div class="nav__contact">
        <div class="nav__social">
          <a href={tgLink} target="_blank" rel="noopener noreferrer" aria-label="Telegram"
            ><img src={tgIcon} alt="Telegram" width="22" height="22" /></a
          >
          <a href={maxLink} target="_blank" rel="noopener noreferrer" aria-label="Макс"
            ><img src={maxIcon} alt="Макс" width="22" height="22" /></a
          >
        </div>
        <a
          class="nav__phone whitespace-nowrap"
          href={'tel:' + phoneHref}
          aria-label={`Позвонить ${phoneNumber}`}
          ><Phone size={16} strokeWidth={2.1} /><span>{phoneNumber}</span></a
        >
      </div>
    </div>
    <div
      class="nav__top-links hidden w-full flex-nowrap items-center justify-between gap-2 py-0 md:ml-auto md:flex md:w-auto md:justify-end md:gap-5 md:py-3"
    >
      <a class="nav__about flex gap-x-1.5" href="/delivery"
        ><Truck class="hidden md:block" size={16} strokeWidth={2.1} /><span class="md:hidden"
          >Доставка</span
        ><span class="hidden md:inline">Доставка по Казани и РТ</span></a
      >
      <button
        class="nav__about nav__about-button flex gap-x-1.5"
        type="button"
        onclick={openRequestModal}
        ><MessageCircleMore class="hidden md:block" size={16} strokeWidth={2.1} /><span
          class="md:hidden">Связаться</span
        ><span class="hidden md:inline">Связаться с нами</span></button
      >
      <a class="nav__about flex gap-x-1.5" href="/about"
        ><Building2 class="hidden md:block" size={16} strokeWidth={2.1} /><span class="md:hidden"
          >О нас</span
        ><span class="hidden md:inline">О компании</span></a
      >
      <a class="nav__about flex gap-x-1.5" href="/podbor"
        ><Sparkles class="hidden md:block" size={16} strokeWidth={2.1} /><span>ИИ подбор</span></a
      >
      <div class="nav__contact !hidden md:!flex">
        <div class="nav__social">
          <a href={tgLink} target="_blank" rel="noopener noreferrer" aria-label="Telegram"
            ><img src={tgIcon} alt="Telegram" width="20" height="20" /></a
          >
          <a href={maxLink} target="_blank" rel="noopener noreferrer" aria-label="Макс"
            ><img src={maxIcon} alt="Макс" width="20" height="20" /></a
          >
        </div>
        <a
          class="nav__phone hidden! whitespace-nowrap md:inline-flex!"
          href={'tel:' + phoneHref}
          aria-label={`Позвонить ${phoneNumber}`}
          ><Phone size={18} strokeWidth={2.1} /><span>{phoneNumber}</span></a
        >
      </div>
    </div>
  </div>
  <Drawer side="right" open={menuOpen} title="Меню" onclose={closeMenuDrawer}>
    <nav class="drawer-links">
      <a href="/user/info" onclick={closeMenuDrawer}
        ><User size={16} strokeWidth={2.1} /><span>Личный кабинет</span></a
      >
      <a href="/sale" onclick={closeMenuDrawer}
        ><BadgePercent size={16} strokeWidth={2.1} /><span>Акции</span></a
      >
      <a href="/delivery" onclick={closeMenuDrawer}
        ><Truck size={16} strokeWidth={2.1} /><span>Доставка</span></a
      >
      <button
        type="button"
        onclick={() => {
          closeMenu();
          openRequestModal();
        }}><MessageCircleMore size={16} strokeWidth={2.1} /><span>Связаться</span></button
      >
      <a href="/about" onclick={closeMenuDrawer}
        ><Building2 size={16} strokeWidth={2.1} /><span>О нас</span></a
      >
      <a href="/podbor" onclick={closeMenuDrawer}
        ><Sparkles size={16} strokeWidth={2.1} /><span>Подбор техники</span></a
      >
      <a href={LINK_TG} target="_blank" rel="noopener noreferrer"
        ><Send size={16} strokeWidth={2.1} /><span>Telegram</span></a
      >
      <a href={LINK_MAX} target="_blank" rel="noopener noreferrer"
        ><Send size={16} strokeWidth={2.1} /><span>MAX</span></a
      >
      <a href={'tel:' + phoneHref} onclick={closeMenuDrawer}
        ><Phone size={16} strokeWidth={2.1} /><span>{phoneNumber}</span></a
      >
    </nav>
  </Drawer>
</div>

<!-- компактная строка (каталог + поиск): липнет к верху, прячется при скролле вниз,
     возвращается при скролле вверх — синхронно с нижней панелью (scrollDirection) -->
<nav
  class="sticky-bar"
  class:sticky-bar--hidden={scrollUi.headerHidden}
  class:sticky-bar--raised={scrollUi.scrolled}
  aria-label="Основное меню"
>
  <div class="sticky-bar__box container mx-auto px-3 sm:px-4">
  <div class="nav__inner h-20 lg:h-25">
    <a class="nav__logo hidden h-11.5 md:flex" href="/"
      ><img class="object-contain" src={logo1} alt="logo" /></a
    >
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="nav__catalog"
      class:hidden-on-search={searchExpanded}
      onmouseenter={openMenu}
      onmouseleave={closeMenu}
    >
      {#if isMobile}
        {#if headerBack}
          <a
            class="catalog-trigger catalog-trigger--back"
            href={headerBack.href}
            aria-label="Назад"
            onclick={() => {
              open = false;
              menuOpen = false;
            }}
          >
            <ArrowLeft size={20} strokeWidth={2.6} />
          </a>
        {:else}
          <button class="catalog-trigger" type="button" onclick={toggleClick}
            ><span class="catalog-trigger__left"><span>Каталог</span></span></button
          >
        {/if}
      {:else}
        <a class="catalog-trigger" href="/catalog"
          ><span class="catalog-trigger__left"><Menu size={18} /><span>Каталог</span></span></a
        >
      {/if}
      {#if isMobile}
        <Drawer side="left" {open} width="min(440px, 86vw)" onclose={closeCatalog}>
          <div class="catalog-mobile-head">
            <a href="/catalog" class="catalog-mobile-link" onclick={closeCatalog}>Каталог</a>
            <button
              type="button"
              class="catalog-close"
              onclick={closeCatalog}
              aria-label="Закрыть каталог"><X size={18} strokeWidth={2.25} /></button
            >
          </div>
          {@render catalogTree()}
        </Drawer>
      {:else}
        <div class="catalog-dropdown" class:visible={open}>
          {@render catalogTree()}
        </div>
      {/if}
    </div>
    <div class="hidden flex-1 lg:block"><ProductSearch hints={searchHints} /></div>
    <div
      class="block flex-1 lg:hidden"
      onfocusin={() => (searchExpanded = true)}
      onfocusout={() => (searchExpanded = false)}
    >
      <ProductSearch hints={searchHints} />
    </div>
    <div class="nav__actions ml-auto lg:ml-0">
      <div class="user-menu-wrap">
        <button
          title={user ? user.full_name : 'Войти'}
          type="button"
          onclick={handleUserClick}
          class="flex items-center gap-2"
        >
          {#if user}<CircleUserRound size="18" />{:else}<User size="18" />{/if}
          <span class="absolute -bottom-4 text-[11px]"
            >{#if user}Профиль{:else}Войти{/if}</span
          >
        </button>
        {#if user && userMenuOpen}
          <div class="user-menu anim-drop-in">
            <div class="user-menu__hello">
              <b>Приветствуем, {user.full_name || user.email}!</b>
              {#if user.email && user.email !== user.full_name}<span>{user.email}</span>{/if}
            </div>
            {#if user.roles?.includes('admin') || user.roles?.includes('seo')}
              <a href="/admin" class="user-menu__admin" onclick={() => (userMenuOpen = false)}
                >Админ-панель</a
              >
            {/if}
            <a href="/user/orders" onclick={() => (userMenuOpen = false)}>Мои заказы</a>
            {#if user.roles?.includes('designer')}
              <a href="/user/offers" onclick={() => (userMenuOpen = false)}>Мои КП</a>
            {/if}
            <a href="/user/info" onclick={() => (userMenuOpen = false)}>Аккаунт</a>
            <button type="button" onclick={logout}>Выйти</button>
          </div>
        {/if}
      </div>
      <a href="/favorites" class="relative"
        ><Heart size="18" />{#if $favCount > 0}<span class="badge">{$favCount}</span>{/if}<span
          class="absolute -bottom-4 text-[11px]">Избранное</span
        ></a
      >
      <a href="/cart" class="relative"
        ><ShoppingCart size="18" />{#if $count > 0}<span class="badge">{$count}</span>{/if}<span
          class="absolute -bottom-4 text-[11px]">Корзина</span
        ></a
      >
    </div>
  </div>
  <!-- бэкдроп живёт внутри sticky-bar: панель создаёт stacking context,
       снаружи его z-index перекрыл бы само меню -->
  {#if user && userMenuOpen}<button
      class="user-menu-backdrop"
      type="button"
      aria-label="Закрыть меню"
      onclick={() => (userMenuOpen = false)}
    ></button>{/if}
  </div>
</nav>

<LeadRequestModal bind:open={requestOpen} />
<AuthModal bind:open={authOpen} bind:mode={authMode} />

<style lang="scss">
  .nav {
    background: #fff;

    &__about {
      align-items: center;
      color: #111827;
      font-size: 0.8125rem;
      padding: 12px 0;
      font-weight: 700;
      line-height: 1.1;
      text-decoration: none;
      transition: color 0.15s ease;
      :global(svg) {
        color: $green;
        flex: 0 0 auto;
      }
      &:hover {
        color: $green;
      }
      @media (min-width: 768px) {
        font-size: 1rem;
        font-weight: 600;
      }
    }
    &__about-button {
      border: 0;
      background: transparent;
      cursor: pointer;
    }
    &__phone {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: #111827;
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 700;
      line-height: 1;
      :global(svg) {
        color: $green;
        flex: 0 0 auto;
      }
      &:hover {
        color: $green;
      }
      @media (min-width: 768px) {
        gap: $sp-2;
        font-size: 1.05rem;
        font-weight: 700;
      }
    }
    &__inner {
      display: flex;
      align-items: center;
      gap: $sp-3;
      @media (min-width: 1024px) {
        gap: $sp-4;
      }
    }
    &__catalog {
      position: relative;
      // при фокусе на поиск (мобилка) каталог прячется, инпут занимает всю строку
      &.hidden-on-search {
        display: none;
      }
      // двойной класс для специфичности выше базового .catalog-trigger (иначе 42px победит)
      .catalog-trigger.catalog-trigger--back {
        // высота инпута поиска (50px), радиус как у него — кнопки выглядят парой
        width: 50px;
        height: 50px;
        border-radius: 10px;
        padding: 0;
        background: rgba($green, 0.08);
        color: $green;
        justify-content: center;
        -webkit-tap-highlight-color: transparent;
        transition:
          background 0.15s ease,
          transform 0.15s ease;
        &:hover {
          background: rgba($green, 0.16);
          transform: scale(1.05);
        }
        &:active {
          transform: scale(0.95);
        }
      }
      .catalog-trigger {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        height: 42px;
        padding: 0 $sp-4;
        border-radius: 12px;
        text-decoration: none;
        color: #fff;
        background: rgba($green-light, 1);
        transition: background 0.15s ease;
        &__left {
          display: inline-flex;
          align-items: center;
          gap: $sp-2;
          font-size: 0.875rem;
          font-weight: 600;
        }
      }
      .catalog-dropdown {
        position: absolute;
        top: calc(100% + $sp-2);
        left: 0;
        z-index: 20;
        width: 440px;
        max-height: min(68vh, 620px);
        overflow: auto;
        border: 1px solid rgba($yellow, 0.22);
        border-radius: 16px;
        background: #fff;
        box-shadow: 0 18px 44px rgba(0, 0, 0, 0.1);
        opacity: 0;
        visibility: hidden;
        transform: translateY(8px);
        transition:
          opacity 0.15s ease,
          visibility 0.15s ease,
          transform 0.15s ease;
        &.visible {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
        }
      }
      .catalog-mobile-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: $sp-3;
        margin-bottom: $sp-3;
        padding: $sp-4 $sp-4 0;
      }
      .catalog-mobile-link {
        color: #141414;
        font-size: 1.125rem;
        font-weight: 700;
        text-decoration: underline;
        text-underline-offset: 4px;
      }
      .catalog-close {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 38px;
        height: 38px;
        padding: 0;
        background: #fff;
        cursor: pointer;
        flex: 0 0 38px;
        :global(svg) {
          display: block;
          flex: 0 0 auto;
        }
      }
      .catalog-close {
        border: 1px solid rgba($green, 0.5);
        border-radius: 8px;
      }
      .tree-parent {
        display: grid;
        &__head {
          border-bottom: 1px solid rgba($green, 0.12);
          border-top: 1px solid rgba($green, 0.12);
          background: rgba(128, 128, 128, 0.05);
          padding: $sp-3 $sp-4;
          margin-bottom: $sp-2;
        }
        &__title {
          margin: 0;
          color: #1a1a1a;
          font-size: 1rem;
          font-weight: 600;
          line-height: 1.12;
          letter-spacing: -0.02em;
        }
        &__accordion {
          // без капсулы и без боковых/крайних отступов — все категории симметричны,
          // зазор между заголовком и списком даёт margin у __head
          margin: 0;
        }
      }
      .acc-cat {
        border-top: 1px solid rgba(0, 0, 0, 0.06);
        &:first-child {
          border-top: none;
        }
        &__row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: $sp-3;
          width: 100%;
          padding: $sp-3 $sp-4;
          border: 0;
          background: none;
          text-align: left;
          cursor: pointer;
        }
        &__name {
          min-width: 0;
          color: #141414;
          font-size: 1rem;
          font-weight: 400;
          line-height: 1.25;
        }
        &__meta {
          display: inline-flex;
          align-items: center;
          gap: $sp-2;
          flex-shrink: 0;
          :global(svg) {
            color: #9ca3af;
          }
        }
        &__count {
          color: #6b7280;
          font-size: 0.875rem;
          font-weight: 400;
        }
        &__card {
          margin: 0 $sp-3 $sp-3;
          padding: $sp-3;
          border-radius: 12px;
          // лёгкий зелёный — белые чипсы с их бордером и так читаются
          background: rgba($green, 0.08);
        }
        &__chips {
          display: flex;
          flex-wrap: wrap;
          gap: $sp-2;
        }
        &__chip {
          display: inline-flex;
          align-items: center;
          padding: $sp-2 $sp-3;
          // бордер в полсилы зелёного всегда, на ховере — полный
          border: 1px solid rgba($green, 0.5);
          border-radius: 999px;
          background: #fff;
          color: #374151;
          font-size: 0.8125rem;
          font-weight: 400;
          text-decoration: none;
          transition:
            background 0.15s ease,
            border-color 0.15s ease,
            color 0.15s ease;
          &:hover {
            border-color: $green;
            background: #fff;
            color: $green;
          }
        }
        &__all {
          display: inline-flex;
          align-items: center;
          gap: $sp-2;
          margin-top: $sp-3;
          color: $green;
          font-size: 0.8125rem;
          font-weight: 600;
          font-style: italic;
          text-decoration: none;
          :global(svg) {
            transition: transform 0.15s ease;
          }
          &:hover :global(svg) {
            transform: translateX(3px);
          }
        }
      }
      // раскрытая категория: зелёное жирное название, зелёный шеврон, карточка
      .acc-cat--open .acc-cat__row {
        padding-bottom: $sp-2;
      }
      .acc-cat--open .acc-cat__name {
        color: $green;
        font-weight: 700;
      }
      .acc-cat--open .acc-cat__meta :global(svg) {
        color: $green;
      }
      @media (max-width: 1023px) {
        // на мобилке каталог живёт в Drawer (слева), dropdown не нужен
        .catalog-dropdown {
          display: none;
        }
      }
    }
  }
  .nav__actions {
    // на мобилке Войти/Избранное/Корзина не дублируем — они в нижнем меню
    display: none;
    @media (min-width: 1024px) {
      display: flex;
    }
    gap: $sp-4;
    button,
    a {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 42px;
      height: 42px;
      border-radius: 8px;
      background: rgba($green, 0.05);
      transition: background 0.2s ease;
      :global(svg) {
        color: $green;
      }
      &:hover:not(.disabled) {
        background: $green-light;
        :global(svg) {
          color: #fff !important;
        }
      }
    }
  }
  .user-menu-wrap {
    position: relative;
  }
  .user-menu {
    position: absolute;
    top: calc(100% + $sp-2);
    right: 0;
    z-index: 1002;
    min-width: 190px;
    padding: $sp-2;
    &__hello {
      display: grid;
      gap: $sp-1;
      padding: $sp-2 $sp-3 $sp-3;
      margin-bottom: $sp-2;
      border-bottom: 1px solid rgba($green, 0.14);
      b {
        font-size: 0.8125rem;
        font-weight: 700;
        color: #111827;
        line-height: 1.3;
      }
      span {
        font-size: 0.75rem;
        color: #94a3b8;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }
    border: 1px solid rgba($green, 0.14);
    border-radius: 12px;
    background: #fff;
    box-shadow: 0 18px 44px rgba(0, 0, 0, 0.12);
    a,
    button {
      width: 100%;
      height: 40px;
      justify-content: flex-start;
      padding: 0 $sp-3;
      border-radius: 8px;
      background: transparent;
      color: #111827;
      font-size: 0.875rem;
      text-decoration: none;
      cursor: pointer;
      &:hover {
        background: rgba($green, 0.06) !important;
        color: #111827 !important;
      }
    }
    .user-menu__admin {
      border: 1px solid rgba($green, 0.45);
    }
  }
  .user-menu-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1001;
    background: transparent;
  }
  .badge {
    position: absolute;
    top: -4px;
    right: -6px;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    background: $accent-red;
    color: #fff;
    font-size: 0.625rem;
    line-height: 1;
    box-sizing: border-box;
  }
  .nav__contact {
    display: flex;
    align-items: center;
    gap: $sp-3;
  }
  .nav__social {
    display: flex;
    align-items: center;
    gap: $sp-2;
    a {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      overflow: hidden;
      transition: transform 0.15s ease;
      &:hover {
        transform: scale(1.1);
      }
      img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
    }
  }
  .nav__burger {
    cursor: pointer;
  }
  // ссылки правого меню (контент Drawer — скоуп родителя действует на сниппет)
  .drawer-links {
    display: flex;
    flex-direction: column;
    gap: $sp-1;
    padding: $sp-3 $sp-2;

    a,
    button {
      display: flex;
      align-items: center;
      gap: $sp-3;
      width: 100%;
      padding: $sp-3;
      border: 0;
      border-radius: 8px;
      background: none;
      color: #111827;
      font-size: 0.9375rem;
      font-weight: 600;
      text-align: left;
      cursor: pointer;
      text-decoration: none;

      &:hover {
        background: #f8fafc;
      }
      span {
        flex: 1;
        text-align: left;
      }
    }
  }
  // правое меню — только мобильное (BottomNav скрыт от 768px)
  @media (min-width: 768px) {
    .nav__burger,
    :global(.drawer--right) {
      display: none;
    }
  }
  // липкая компактная строка шапки. z-index 870: ниже дровера (880/890),
  // нижней панели (900) и модалок (1000+), но выше контента страницы.
  // ВАЖНО: без will-change — он держит панель на отдельном слое композитора,
  // и фон catalog-dropdown рисуется под контентом страницы (прозрачный дропдаун)
  .sticky-bar {
    position: sticky;
    top: 0;
    z-index: 870;
    transition: transform 0.28s ease;
  }
  .sticky-bar--hidden {
    transform: translateY(-100%);
  }
  .sticky-bar__box {
    background: #fff;
    transition: box-shadow 0.28s ease;
  }
  .sticky-bar--raised .sticky-bar__box {
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
  }
</style>
