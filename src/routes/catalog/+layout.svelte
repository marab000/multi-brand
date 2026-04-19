<script lang="ts">
  import { navigating, page } from '$app/stores';
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
  import SidebarFilters from '$lib/components/filters/SidebarFilters.svelte';

  type TypeItem = { name: string; slug: string };
  type TypeGroup = { group: string; items: TypeItem[] };
  type CategoryNavItem = { name: string; slug: string; href: string; level: 'group' | 'leaf' };
  type BreadcrumbItem = { name: string; href?: string };

  let { data } = $props<{
    data?: {
      categoryNav?: CategoryNavItem[];
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
  }>();

  let showFilters = $state(false);

  const isLoading = $derived($navigating !== null);
  const pathname = $derived($page.url.pathname);
  const isCatalogRoot = $derived(pathname === '/catalog');

  const breadcrumbs = $derived(($page.data?.breadcrumbs ?? [
    { name: 'Главная', href: '/' },
    { name: 'Каталог', href: '/catalog' }
  ]) as BreadcrumbItem[]);

  const product = $derived($page.data?.product ?? null);
  const categoryNav = $derived(data?.categoryNav ?? []);
  const typeGroups = $derived(data?.typeGroups ?? []);
  const brands = $derived(data?.brands ?? []);
  const colors = $derived(data?.colors ?? []);
  const minMax = $derived(
    data?.minMax ?? {
      price: [0, 999999],
      width: [0, 300],
      height: [0, 300],
      depth: [0, 300]
    }
  );
</script>

{#if isLoading}
  <div class="global-loader"><div class="spinner"></div></div>
{/if}

<Breadcrumbs items={breadcrumbs} {product} />

{#if !isCatalogRoot}
  <div class="mobile-bar">
    <button onclick={() => (showFilters = true)}>Фильтры</button>
  </div>
{/if}

<div class="catalog-layout" class:catalog-layout--root={isCatalogRoot}>
  {#if !isCatalogRoot}
    <div class="sidebar">
      <SidebarFilters {categoryNav} {brands} {typeGroups} {colors} {minMax} />
    </div>
  {/if}

  <div class="catalog-content">
    <slot />
  </div>
</div>

{#if showFilters && !isCatalogRoot}
  <button class="overlay" onclick={() => (showFilters = false)}></button>
  <div class="drawer">
    <div class="drawer-header">
      <span>Фильтры</span>
      <button class="close" onclick={() => (showFilters = false)}>✕</button>
    </div>
    <SidebarFilters {categoryNav} {brands} {typeGroups} {colors} {minMax} />
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
    gap: 16px;
    @media (min-width: 1024px) {
      grid-template-columns: 250px 1fr;
      gap: 20px;
    }
    @media (min-width: 1280px) {
      grid-template-columns: 300px 1fr;
      gap: 24px;
    }
    &--root {
      grid-template-columns: 1fr !important;
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
  .drawer :global(.filters) {
    flex: 1;
    min-height: 0;
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