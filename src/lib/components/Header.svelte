<script lang="ts">
  import AuthModal from '$lib/components/AuthModal.svelte';
  import ProductSearch from '$lib/components/ProductSearch.svelte';
  import logo1 from '$lib/assets/logo1.png';
  import { cart } from '$lib/stores/cart';
  import { derived } from 'svelte/store';
  import { slugify } from '$lib/utils/slugify';

  let { data } = $props();

  let open = $state(false);
  let timeout: any;

  let showLogin = $state(false);
  let showRegister = $state(false);

  const count = derived(cart, ($c) => $c.reduce((sum, i) => sum + i.qty, 0));

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
  console.log(data);
</script>

<AuthModal bind:open={showRegister} mode="register" />
<AuthModal bind:open={showLogin} mode="login" />

<nav class="nav">
  <div class="nav__inner container mx-auto">
    <a class="nav__logo" href="/">
      <img src={logo1} alt="logo" />
    </a>

    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="nav__catalog" on:mouseenter={openMenu} on:mouseleave={closeMenu}>
      <button title="" class="catalog-btn flex items-center" on:click={toggleClick}>
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
                  <a href={`/catalog/${slugify(cat.group)}?type=${encodeURIComponent(item)}`}>
                    {item}
                  </a>
                </li>
              {/each}
            </ul>
          </div>
        {/each}
      </div>
    </div>

    <ProductSearch />

    <div class="nav__actions">
      <button title="" on:click={() => (showLogin = true)}>
        <i class="fa-regular fa-user"></i>
      </button>
      <button title="">
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
</nav>

<style lang="scss">
  .nav {
    background: white;
    &__inner {
      display: flex;
      align-items: center;
      gap: 20px;
      height: 100px;
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
    width: 320px; // 👈 фикс вместо кривого грида
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
        padding-left: 14px; // 👈 ВЛОЖЕННОСТЬ
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
      &:hover {
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
