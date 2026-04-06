<script lang="ts">
  import AuthModal from '$lib/components/AuthModal.svelte';
  import ProductSearch from '$lib/components/ProductSearch.svelte';
  import logo1 from '$lib/assets/logo1.png';
  import { cart } from '$lib/stores/cart';
  import { derived } from 'svelte/store';
  import { slugify } from '$lib/utils/slugify';
  import { page } from '$app/stores';

  let { data } = $props();

  let open = $state(false);
  let timeout: any;

  const count = derived(cart, ($c) => $c.reduce((sum, i) => sum + i.qty, 0));

  let pathname = '';
  let showSearch = $state(false);

  $effect(() => {
    pathname = $page.url.pathname;
    showSearch =
      pathname === '/' || pathname.startsWith('/catalog') || pathname.startsWith('/products');
  });

  function openMenu() {
    clearTimeout(timeout);
    open = true;
  }

  function closeMenu() {
    timeout = setTimeout(() => {
      open = false;
    }, 180);
  }

  function toggleClick() {
    open = !open;
  }
</script>

<!-- <AuthModal bind:open={showRegister} mode="register" />
<AuthModal bind:open={showLogin} mode="login" /> -->

<nav class="nav container mx-auto">
  <div class="nav__inner h-20 px-3 lg:h-25">
    <a class="nav__logo" href="/">
      <img src={logo1} alt="logo" />
    </a>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="nav__catalog" onmouseenter={openMenu} onmouseleave={closeMenu}>
      <button class="catalog-btn flex items-center" onclick={toggleClick}>
        <i class="fa-solid fa-bars"></i>
        <span class="ml-1.5">Каталог</span>
      </button>

      <div class="catalog-dropdown" class:visible={open}>
        {#each data.typeGroups as cat}
          <div class="cat">
            <a class="cat__title" href={`/catalog/${slugify(cat.group)}`}>
              {cat.group}
            </a>
            <ul class="cat__list">
              {#each cat.items as item}
                <li>
                  <a href={`/catalog/${slugify(cat.group)}?type=${encodeURIComponent(item.name)}`}>
                    {item.name}
                  </a>
                </li>
              {/each}
            </ul>
          </div>
        {/each}
      </div>
    </div>

    <div class="hidden flex-1 lg:block">
      <ProductSearch />
    </div>

    <div class="nav__actions ml-auto lg:ml-0">
      <button title="" class="disabled" style="cursor: default;">
        <i class="fa-regular fa-user"></i>
      </button>
      <button title="" class="disabled" style="cursor: default;">
        <i class="fa-regular fa-heart"></i>
      </button>

      <a href="/cart" class="relative">
        <i class="fa-solid fa-cart-shopping"></i>
        {#if $count > 0}
          <span class="badge">{$count}</span>
        {/if}
      </a>
    </div>
  </div>

  <div class="block flex-1 p-3 lg:hidden">
    {#if showSearch}
      <ProductSearch />
    {/if}
  </div>
</nav>

<style lang="scss">
  .nav {
    background: white;
    &__inner {
      display: flex;
      align-items: center;
      gap: 20px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    }
    &__logo {
      display: flex;
      align-items: center;
      img {
        height: 46px;
        object-fit: contain;
      }
    }
    &__catalog {
      position: relative;
    }
  }

  .catalog-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    width: 320px;
    background: white;
    border-radius: 14px;
    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.12);
    padding: 16px;
    z-index: 20;
    opacity: 0;
    visibility: hidden;
    transform: translateY(8px);
    transition: all 0.18s ease;
    &.visible {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }
    .cat {
      display: flex;
      flex-direction: column;
      margin-bottom: 12px;
      &:last-child {
        margin-bottom: 0;
      }
      &__title {
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 6px;
        color: #222;
        text-decoration: none;
        &:hover {
          color: $green;
        }
      }
      &__list {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding-left: 14px;
        li {
          list-style: none;
        }
        a {
          font-size: 13px;
          color: #555;
          text-decoration: none;
          transition: 0.2s;
          &:hover {
            color: $green;
            transform: translateX(4px);
          }
        }
      }
    }
  }

  .nav__actions {
    display: flex;
    gap: 12px;
    button,
    a {
      width: 42px;
      height: 42px;
      border-radius: 10px;
      background: rgba($green, 0.05);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: 0.2s;
      i {
        color: $green;
      }
      &:hover:not(.disabled) {
        background: $green-light;
        i {
          color: white;
        }
      }
    }
  }

  .badge {
    position: absolute;
    top: -4px;
    right: -6px;
    background: red;
    color: white;
    font-size: 10px;
    padding: 2px 5px;
    border-radius: 999px;
  }
</style>
