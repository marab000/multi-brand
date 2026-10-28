<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import ProductCard from '$lib/components/ProductCard.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  export let products: any[] = [];
  export let currentPage = 1;
  export let pages = 1;
  export let currentSearch = '';
  export let showFiltersButton = true;
  export let showSort = true;
  // слот сортировки прячем на десктопе (каталог: сорт живёт в шапке с H1)
  export let sortSlotMobileOnly = false;
  export let bonusPercent = 0;
  export let excludedBrands: string[] = [];
  function goToPage(p: number) {
    const params = new URLSearchParams($page.url.searchParams);
    params.set('page', String(p));
    goto(`${$page.url.pathname}?${params.toString()}`, { keepFocus: true, noScroll: true });
  }
  function openFilters() {
    window.dispatchEvent(new CustomEvent('catalog:open-filters'));
  }
</script>

{#if products.length === 0}
  <p>Товары не найдены</p>
{:else}
  {#if showFiltersButton || showSort}
    <div class="topbar" class:topbar--right={!showFiltersButton}>
      {#if showFiltersButton}
        <button class="filters-trigger lg:hidden" type="button" onclick={openFilters}>Фильтры</button>
      {/if}
      {#if showSort}
        <div class={sortSlotMobileOnly ? 'lg:hidden' : ''}>
          <slot name="sort" />
        </div>
      {/if}
    </div>
  {/if}
  <div class="grid">
    {#each products as product (product.id)}
      <ProductCard {product} {bonusPercent} {excludedBrands} />
    {/each}
  </div>
  {#if pages > 1}
    <Pagination page={currentPage} totalPages={pages} onPageChange={goToPage} />
  {/if}
{/if}

<style lang="scss">
  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $sp-3;
    margin-bottom: $sp-2;
    &.topbar--right {
      justify-content: flex-end;
    }
    @media (min-width: 1024px) {
      justify-content: flex-end;
    }
  }
  .filters-trigger {
    flex: 0 0 auto;
    min-height: 46px;
    padding: 0 $sp-3;
    border-radius: 8px;
    border: 1px solid #eee;
    background: #fff;
    font-weight: 600;
    white-space: nowrap;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: $sp-2;
    margin-bottom: $sp-6;
  }
</style>
