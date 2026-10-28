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
    flex-direction: column;
    min-height: 100vh;
    background: #fafafa;
  }
  /* мобилка — база: сайдбар сверху, меню горизонтальным скроллом */
  .sidebar {
    width: 100%;
    display: flex;
    flex-direction: column;
    padding: $sp-3;
    gap: $sp-2;
    border-bottom: 1px solid #e9ece8;
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
    flex-direction: row;
    gap: $sp-2;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 2px;
  }
  a {
    text-decoration: none;
    white-space: nowrap;
    flex-shrink: 0;
    padding: $sp-2 $sp-3;
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
    margin-left: auto;
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
    padding: $sp-3;
    overflow-y: visible;
  }
  /* десктоп: сайдбар слева, меню колонкой */
  @media (min-width: 768px) {
    .admin {
      flex-direction: row;
    }
    .sidebar {
      width: 240px;
      gap: 30px;
      padding: $sp-3;
      border-bottom: none;
    }
    nav {
      flex-direction: column;
      gap: $sp-3;
      overflow-x: visible;
      padding-bottom: 0;
    }
    a {
      white-space: normal;
      padding: $sp-3;
    }
    a.logout {
      margin-left: 0;
      margin-top: $sp-4;
    }
    .content {
      padding: 25px;
    }
  }
</style>
