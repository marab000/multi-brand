<script lang="ts">
  import { page } from '$app/stores';
  import { derived } from 'svelte/store';
  export let data: any;

  const activePath = derived(page, ($page) => $page.url.pathname);
</script>

<svelte:head>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>


{#if data.user}
  <div class="admin">
    <aside class="sidebar">
      <div class="logo">ADMIN</div>
      {#if data.user?.name}
        <div class="who">Вы вошли как:<br /><b>{data.user.name}</b></div>
      {/if}
      <nav>
        {#if data.user.role === 'seo'}
          <a href="/admin/seo" class={$activePath.startsWith('/admin/seo') ? 'active' : ''}>SEO-страницы</a>
        {:else}
          <a href="/admin/orders" class={$activePath === '/admin/orders' ? 'active' : ''}>Заказы</a>
          <a href="/admin/cart-exports" class={$activePath.startsWith('/admin/cart-exports') ? 'active' : ''}>Корзины PDF (КП)</a>
          <a href="/admin/users" class={$activePath.startsWith('/admin/users') ? 'active' : ''}>Пользователи</a>
          <a href="/admin/slides" class={$activePath.startsWith('/admin/slides') ? 'active' : ''}>Слайдер</a>
          <a href="/admin/articles" class={$activePath.startsWith('/admin/articles') ? 'active' : ''}>Статьи</a>
          <a href="/admin/podbor" class={$activePath.startsWith('/admin/podbor') ? 'active' : ''}>Собери комплект техники</a>
          <a href="/admin/tetris" class={$activePath.startsWith('/admin/tetris') ? 'active' : ''}>Тетрис</a>
          <a href="/admin/settings" class={$activePath.startsWith('/admin/settings') ? 'active' : ''}>Скидка</a>
        {/if}
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
    min-height: 100vh;
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
  .who {
    font-size: 12.5px;
    color: #94a3b8;
    line-height: 1.5;
    padding: 0 4px;
    b {
      color: #202020;
      font-size: 13.5px;
    }
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
    /* flex-элемент должен уметь сжиматься — иначе внутренние блоки
       фиксированной ширины выталкивают его за край экрана */
    min-width: 0;
    padding: 25px;
    overflow-y: visible;
  }
</style>
