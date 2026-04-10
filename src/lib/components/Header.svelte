<script lang="ts">
  import ProductSearch from '$lib/components/ProductSearch.svelte';
  import logo1 from '$lib/assets/logo1.png';
  import { cart } from '$lib/stores/cart';
  import { derived } from 'svelte/store';
  import { slugify } from '$lib/utils/slugify';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { Menu, ShoppingCart, Heart, User } from 'lucide-svelte';

  let { data } = $props();

  let open = $state(false);
  let timeout: any;
  let openIndex = $state<number | null>(null);
  let isMobile = $state(false);

  const count = derived(cart, ($c) => $c.reduce((sum, i) => sum + i.qty, 0));
  let pathname = '';
  let showSearch = $state(false);

  $effect(() => {
    pathname = $page.url.pathname;
    showSearch =
      pathname === '/' || pathname.startsWith('/catalog') || pathname.startsWith('/products');
  });

  onMount(() => {
    isMobile = window.innerWidth < 1024;
  });

  function openMenu() {
    if (!isMobile) {
      clearTimeout(timeout);
      open = true;
    }
  }
  function closeMenu() {
    if (!isMobile) {
      timeout = setTimeout(() => {
        open = false;
      }, 180);
    }
  }
  function toggleClick() {
    open = !open;
  }
  const toggleCat = (i: number) => {
    openIndex = openIndex === i ? null : i;
  };
  const closeCatalog = () => {
    open = false;
    openIndex = null;
  };
</script>

<nav class="nav container mx-auto">
  <div class="nav__inner h-20 px-3 lg:h-25">
    <a class="nav__logo" href="/"><img src={logo1} alt="logo" /></a>

    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="nav__catalog lg:relative" onmouseenter={openMenu} onmouseleave={closeMenu}>
      <button class="catalog-btn flex items-center" onclick={toggleClick}>
        <Menu size={18} />
        <span class="ml-1.5">Каталог</span>
      </button>

      {#if open && isMobile}
        <div class="catalog-overlay" onclick={closeCatalog}></div>
      {/if}

      <div class="catalog-dropdown" class:visible={open}>
        {#if open && isMobile}
          <div class="catalog-close">
            <button type="button" onclick={closeCatalog}>✕</button>
          </div>
        {/if}
        {#each data.typeGroups as cat, i}
          <div class="cat">
            <div class="cat__header">
              <a
                class="cat__title"
                href={`/catalog/${slugify(cat.group)}`}
                onclick={isMobile ? closeCatalog : undefined}>{cat.group}</a
              >
              {#if cat.items.length}
                <button class="cat__toggle" type="button" onclick={() => toggleCat(i)}>
                  <span class:rotated={openIndex === i}>+</span>
                </button>
              {/if}
            </div>
            <ul class="cat__list" class:open={openIndex === i}>
              {#each cat.items as item}
                <li>
                  <a
                    href={`/catalog/${slugify(cat.group)}?type=${encodeURIComponent(item.name)}`}
                    onclick={isMobile ? closeCatalog : undefined}>{item.name}</a
                  >
                </li>
              {/each}
            </ul>
          </div>
        {/each}
      </div>
    </div>

    <div class="hidden flex-1 lg:block"><ProductSearch /></div>

    <div class="nav__actions ml-auto lg:ml-0">
      <button title="" class="disabled" style="cursor: default;"><User size="18" /></button>
      <button title="" class="disabled" style="cursor: default;"><Heart size="18" /></button>
      <a href="/cart" class="relative">
        <ShoppingCart size="18" />
        {#if $count > 0}<span class="badge">{$count}</span>{/if}
      </a>
    </div>
  </div>

  <div class="block flex-1 p-3 lg:hidden">
    {#if showSearch}<ProductSearch />{/if}
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
      .catalog-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.3);
        z-index: 15;
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
        .catalog-close {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 8px;
          button {
            width: 40px;
            height: 40px;
            border-radius: 8px;
            border: none;
            font-size: 20px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
          }
        }
        .cat {
          display: flex;
          flex-direction: column;
          &:last-child {
            margin-bottom: 0;
          }
          &__header {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          &__title {
            font-size: 14px;
            font-weight: 600;
            color: #222;
            text-decoration: none;
            cursor: pointer;
            border-bottom: 1px solid transparent !important;
            &:hover {
              color: $green;
              border-bottom: 1px solid $green !important;
            }
          }
          &__toggle {
            min-width: 34px;
            width: 34px;
            min-height: 34px;
            height: 34px;
            border-radius: 5px;
            // border: 1px solid rgba(128, 128, 128, 0.309) !important;
            box-shadow: inset 0 0 4px 0 rgba($yellow, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            background: none;
            border: none;
            cursor: pointer;
            font-size: 18px;
            line-height: 1;
            transition: 0.2s;
            span {
              display: inline-block;
              transition: transform 0.2s ease;
            }
            .rotated {
              transform: rotate(45deg);
            }
          }
          &__list {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.25s ease;
            display: flex;
            flex-direction: column;
            gap: 4px;
            padding-left: 14px;
            margin-top: 6px;
            li {
              list-style: none;
            }
            a {
              font-size: 13px;
              color: #555;
              text-decoration: none;
              transition: 0.2s;
              border-bottom: 1px solid transparent !important;
              &:hover {
                color: $green;
                border-bottom: 1px solid $green !important;
              }
            }
            &.open {
              max-height: 500px;
              overflow: auto;
            }
          }
        }
      }
      @media (max-width: 1023px) {
        .catalog-dropdown {
          position: fixed;
          top: 0;
          left: 0;
          width: 80%;
          max-width: 80%;
          height: 100%;
          border-radius: 0;
          padding: 16px;
          box-shadow: none;
          background: white;
          z-index: 25;
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
      :global(svg) {
        color: $green;
      }
      &:hover:not(.disabled) {
        color: #fff;
        background: $green-light;
        :global(svg) {
          color: #fff !important;
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
