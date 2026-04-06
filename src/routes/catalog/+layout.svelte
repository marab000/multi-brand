<script lang="ts">
  import { navigating, page } from '$app/stores';
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
  import SidebarFilters from '$lib/components/filters/SidebarFilters.svelte';

  type TypeItem = { name: string; slug: string };
  type TypeGroup = { group: string; items: TypeItem[] };

  export let data: {
    typeGroups?: TypeGroup[];
    brands?: string[];
    colors?: string[];
    minMax?: {
      price: [number, number];
      width: [number, number];
      height: [number, number];
      depth: [number, number];
    };
    category?: string;
  };

  let showFilters = false;

  $: isLoading = $navigating !== null;
  $: brand = $page.data?.brand ?? null;
  $: category = $page.data?.category ?? null;
  $: type = $page.data?.type ?? null;

  $: typeGroups = data.typeGroups ?? [];
  $: brands = data.brands ?? [];

  $: minMax = data.minMax ?? {
    price: [0, 999999],
    width: [0, 300],
    height: [0, 300],
    depth: [0, 300]
  };
</script>

{#if isLoading}
  <div class="global-loader"><div class="spinner"></div></div>
{/if}

<Breadcrumbs {brand} {category} {type} />

<div class="mobile-bar">
  <button onclick={() => (showFilters = true)}>Фильтры</button>
</div>

<div class="catalog-layout lg:gap-3 xl:gap-4">
  <div class="sidebar">
    <SidebarFilters
      {brands}
      {typeGroups}
      colors={data.colors ?? []}
      {minMax}
      activeCategory={data.category}
    />
  </div>

  <div class="catalog-content">
    <slot />
  </div>
</div>

{#if showFilters}
  <button class="overlay" onclick={() => (showFilters = false)}></button>
  <div class="drawer">
    <div class="drawer-header">
      <span>Фильтры</span>
      <button class="close" onclick={() => (showFilters = false)}>✕</button>
    </div>
    <SidebarFilters
      {brands}
      {typeGroups}
      colors={data.colors ?? []}
      {minMax}
      activeCategory={data.category}
    />
  </div>
{/if}

<style lang="scss">
  .mobile-bar {
    display: none;
    margin-top: 10px;
    button {
      padding: 10px 14px;
      border-radius: 10px;
      border: 1px solid #eee;
      background: #fff;
      font-weight: 600;
    }
    @media (max-width: 1023px) {
      display: block;
    }
  }

  .catalog-layout {
    display: grid;
    margin-top: 20px;
    grid-template-columns: 1fr;
    @media (min-width: 1024px) {
      grid-template-columns: 250px 1fr;
    }
    @media (min-width: 1280px) {
      grid-template-columns: 300px 1fr;
    }
    .catalog-content {
      min-width: 0;
    }
    .sidebar {
      @media (max-width: 1023px) {
        display: none;
      }
    }
  }

  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 1000;
  }

  .drawer {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    width: 400px;
    max-width: 80%;
    background: #fff;
    z-index: 1001;
    display: flex;
    flex-direction: column;
    animation: slideIn 0.25s ease;
    padding: 16px 16px calc(16px + env(safe-area-inset-bottom));
    box-sizing: border-box;
  }

  .drawer-header {
    flex-shrink: 0;
  }

  .drawer :global(.filters) {
    flex: 1;
    min-height: 0;
  }

  .drawer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 600;
    .close {
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
    }
  }

  @keyframes slideIn {
    from {
      transform: translateX(-100%);
    }
    to {
      transform: translateX(0);
    }
  }

  .global-loader {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.6);
    backdrop-filter: blur(2px);
    z-index: 9999;
    .spinner {
      width: 48px;
      height: 48px;
      border: 4px solid #ddd;
      border-top: 4px solid black;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
