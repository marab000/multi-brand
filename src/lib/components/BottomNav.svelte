<script lang="ts">
  import { page } from '$app/state';
  import { Home, LayoutGrid, ShoppingCart, Heart, User } from 'lucide-svelte';
  import { cart } from '$lib/stores/cart';
  import { favorites } from '$lib/stores/favorites';

  let cartCount = $derived($cart.reduce((sum, i) => sum + i.qty, 0));
  let favCount = $derived($favorites.length);

  let pathname = $derived(page.url.pathname);

  const items = [
    { href: '/', label: 'Главная', icon: Home, exact: true },
    { href: '/catalog', label: 'Каталог', icon: LayoutGrid, exact: true },
    { href: '/cart', label: 'Корзина', icon: ShoppingCart, badge: () => cartCount },
    { href: '/favorites', label: 'Избранное', icon: Heart, badge: () => favCount },
    { href: '/user', label: 'Профиль', icon: User }
  ];

  let isActive = (item: (typeof items)[number]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);
</script>

<nav class="bottom-nav md:hidden!" aria-label="Мобильное меню">
  {#each items as item (item.href)}
    <a
      class="bottom-nav__item"
      class:bottom-nav__item--active={isActive(item)}
      href={item.href}
      aria-current={isActive(item) ? 'page' : undefined}
    >
      <span class="bottom-nav__icon">
        <item.icon size={21} strokeWidth={2} />
        {#if item.badge && item.badge() > 0}
          <span class="bottom-nav__badge">{item.badge() > 99 ? '99+' : item.badge()}</span>
        {/if}
      </span>
      <span class="bottom-nav__label">{item.label}</span>
    </a>
  {/each}
</nav>

<style lang="scss">
  .bottom-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 900;
    display: flex;
    align-items: stretch;
    justify-content: space-around;
    background: #1c1c1e;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    padding: 6px 4px calc(6px + env(safe-area-inset-bottom, 0px));

    // только мобильные/планшеты — на десктопе меню нет
    @media (min-width: 768px) {
      display: none;
    }

    &__item {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      padding: 4px 0;
      color: #8e8e93;
      text-decoration: none;
      -webkit-tap-highlight-color: transparent;
      transition: color 0.15s ease;

      &:active {
        color: #fff;
      }

      &--active {
        color: #fff;
      }
    }

    &__icon {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 0;
    }

    &__badge {
      position: absolute;
      top: -5px;
      right: -11px;
      min-width: 16px;
      height: 16px;
      padding: 0 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      background: #ef4444;
      color: #fff;
      font-size: 10px;
      font-weight: 700;
      line-height: 1;
    }

    &__label {
      font-size: 10px;
      font-weight: 600;
      line-height: 1.2;
    }
  }
</style>
