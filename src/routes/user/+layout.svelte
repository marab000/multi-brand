<script lang="ts">
  // import type { LayoutData } from './$types';
  import { page } from '$app/stores';
  // export let data: LayoutData;
</script>

<div class="user container mx-auto px-4">
  <aside class="user__nav">
    <h1>Профиль</h1>
    <a href="/user/info" class:active={$page.url.pathname === '/user/info'}>Мои данные</a>
    <a href="/user/orders" class:active={$page.url.pathname === '/user/orders'}>Мои заказы</a>
  </aside>
  <section class="user__content">
    <slot />
  </section>
</div>

<style lang="scss">
  .user {
    display: grid;
    grid-template-columns: 240px minmax(0, 1fr);
    gap: 24px;
    padding-top: 28px;
    padding-bottom: 40px;
    &__nav {
      display: flex;
      flex-direction: column;
      align-self: flex-start;
      gap: 8px;
      padding: 16px;
      border: 1px solid #eee;
      border-radius: 14px;
      background: #fff;
      h1 {
        margin: 0 0 6px;
        font-size: 20px;
        font-weight: 700;
      }
      a {
        padding: 10px 12px;
        border-radius: 10px;
        text-decoration: none;
        color: #202020;
        background: rgba($green, 0.04);
        border: 1px solid transparent;
        &:hover:not(.active) {
          border-color: rgba($yellow, 0.5);
        }
        &.active {
          // background: rgba($green, 0.12);
          // color: $green;
          border-color: $yellow;
        }
      }
    }
    &__content {
      min-width: 0;
    }
    @media (max-width: 767px) {
      grid-template-columns: 1fr;
    }
  }
</style>
