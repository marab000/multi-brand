<script lang="ts">
  import { page } from '$app/stores';

  const links = [
    { href: '/user/orders', label: 'Мои заказы' },
    { href: '/user/info', label: 'Аккаунт' }
  ];
</script>

<div class="user">
  <div class="user__nav-wrap">
    <nav class="user__nav container mx-auto" aria-label="Навигация личного кабинета">
      {#each links as link}
        <a href={link.href} class:active={$page.url.pathname === link.href}>{link.label}</a>
      {/each}
    </nav>
  </div>
  <section class="user__content container mx-auto">
    <slot />
  </section>
</div>

<style lang="scss">
  .user {
    padding-bottom: 40px;
    &__nav-wrap {
      border-bottom: 1px solid #eee;
    }
    &__nav {
      display: flex;
      align-items: center;
      gap: 26px;
      a {
        position: relative;
        flex: 0 0 auto;
        padding: 4px 0 18px;
        color: #202020;
        font-size: 15px;
        font-weight: 500;
        text-decoration: none;
        transition: color 0.2s ease;
        &::after {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          bottom: -1px;
          height: 3px;
          border-radius: 999px 999px 0 0;
          background: $green-soft;
          transform: scaleX(0);
          transform-origin: center;
          transition: transform 0.22s ease;
        }
        &:hover,
        &.active {
          color: $green-soft;
        }
        &.active::after {
          transform: scaleX(1);
        }
      }
    }
    &__content {
      min-width: 0;
    }
    @media (max-width: 767px) {
      &__nav {
        gap: 20px;
        a {
          padding: 16px 0 15px;
          font-size: 14px;
        }
      }
    }
  }
</style>
