<script lang="ts">
  import { page } from '$app/state';
  import { LayoutGrid, ShoppingCart, User, MoreHorizontal } from 'lucide-svelte';
  import { cart } from '$lib/stores/cart';
  import logo from '$lib/assets/logo1.png';

  let cartCount = $derived($cart.reduce((sum, i) => sum + i.qty, 0));

  let pathname = $derived(page.url.pathname);

  // «Каталог» на мобиле не уводит на страницу — открывает боковой каталог в Header
  const openCatalog = (e: MouseEvent) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('open-catalog-menu'));
  };
  // правый пункт «Меню» — открывает правое меню с остальными ссылками
  const openMenuDrawer = (e: MouseEvent) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('open-menu-drawer'));
  };
</script>

<nav class="bottom-nav md:hidden!" aria-label="Мобильное меню">
  <a
    class="bottom-nav__item"
    class:bottom-nav__item--active={pathname.startsWith('/catalog')}
    href="/catalog"
    onclick={openCatalog}
  >
    <span class="bottom-nav__icon"><LayoutGrid size={21} strokeWidth={2} /></span>
    <span class="bottom-nav__label">Каталог</span>
  </a>

  <a
    class="bottom-nav__item"
    class:bottom-nav__item--active={pathname.startsWith('/user')}
    href="/user/info"
  >
    <span class="bottom-nav__icon"><User size={21} strokeWidth={2} /></span>
    <span class="bottom-nav__label">Кабинет</span>
  </a>

  <a class="bottom-nav__center" href="/" aria-label="На главную">
    <img src={logo} alt="Мультибренд" />
  </a>

  <a
    class="bottom-nav__item"
    class:bottom-nav__item--active={pathname.startsWith('/cart')}
    href="/cart"
  >
    <span class="bottom-nav__icon">
      <ShoppingCart size={21} strokeWidth={2} />
      {#if cartCount > 0}
        <span class="bottom-nav__badge">{cartCount > 99 ? '99+' : cartCount}</span>
      {/if}
    </span>
    <span class="bottom-nav__label">Корзина</span>
  </a>

  <a class="bottom-nav__item" href="#menu" onclick={openMenuDrawer}>
    <span class="bottom-nav__icon"><MoreHorizontal size={21} strokeWidth={2} /></span>
    <span class="bottom-nav__label">Меню</span>
  </a>
</nav>

<style lang="scss">
  .bottom-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 900;
    display: flex;
    align-items: flex-end;
    justify-content: space-around;
    background: #1c1c1e;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    padding: 8px 4px calc(8px + env(safe-area-inset-bottom, 0px));

    // только мобильные/планшеты — на десктопе меню нет
    @media (min-width: 768px) {
      display: none;
    }
  }
  .bottom-nav__item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 4px 0;
    color: rgba(255, 255, 255, 0.72);
    text-decoration: none;

    &:hover {
      color: #fff;
    }
  }
  .bottom-nav__icon {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 24px;
  }
  .bottom-nav__label {
    font-size: 0.6875rem;
    font-weight: 600;
    line-height: 1;
  }
  .bottom-nav__badge {
    position: absolute;
    top: -6px;
    right: -12px;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    border-radius: 999px;
    background: $yellow;
    color: #111;
    font-size: 0.625rem;
    font-weight: 800;
  }
  .bottom-nav__center {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 54px;
    height: 54px;
    margin-top: -24px;
    border-radius: 999px;
    border: 3px solid #1c1c1e;
    background: #fff;
    overflow: hidden;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.35);
    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      padding: 8px;
    }
  }
</style>
