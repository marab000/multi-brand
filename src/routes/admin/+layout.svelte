<script lang="ts">
  import { page } from '$app/stores';
  import { derived } from 'svelte/store';
  export let data: any;

  const activePath = derived(page, ($page) => $page.url.pathname);
</script>

{#if data.user}
  <div class="admin">
    <aside class="sidebar">
      <div class="logo">ADMIN</div>
      <nav>
        <a href="/admin/orders" class={$activePath === '/admin/orders' ? 'active' : ''}>Заказы</a>
        <a href="/admin/cart-exports" class={$activePath.startsWith('/admin/cart-exports') ? 'active' : ''}>Корзины (PDF)</a>
        <a class="logout" href="/admin/logout">Выйти</a>
      </nav>
    </aside>
    <main class="content">
      <slot />
    </main>
  </div>
{:else}
  <slot />
{/if}

<style lang="scss">
  .admin {
    display: flex;
    height: 100vh;
    background: #fafafa;
  }
  .sidebar {
    width: 240px;
    display: flex;
    flex-direction: column;
    padding: 12px;
    gap: 30px;
  }
  .logo {
    font-size: 20px;
    font-weight: 700;
    color: $green;
  }
  nav {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  a {
    text-decoration: none;
    padding: 10px 15px;
    border-radius: 10px;
    color: #333;
    background: #fff;
    border: 1px solid rgba($yellow, 0.4);
    transition: 0.2s;
    &:hover {
      background: rgba($yellow, 0.5);
    }
  }
  a.active {
    background: $yellow;
    color: #000;
    font-weight: 600;
    border-color: $yellow;
  }
  a.logout {
    margin-top: 16px;
    color: $error;
    border: 1px solid rgba($error, 0.3);
    &:hover {
      background: $error;
      color: #fff;
      border-color: $error;
    }
  }
  .content {
    flex: 1;
    padding: 25px;
    overflow: auto;
  }
</style>
