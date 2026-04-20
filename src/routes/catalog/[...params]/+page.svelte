<script lang="ts">
  import type { PageData } from './$types';
  import ProductList from '$lib/components/ProductList.svelte';

  export let data: PageData;
  $: products = data.products ?? [];
  $: searchValue = data.isSearchPage
    ? (new URLSearchParams(data.currentSearch ?? '').get('search')?.trim() ?? '')
    : '';
</script>

<main class="catalog-content">
  <h1 class="title" style="font-size:24px">
    {#if data.category}
      {data.category}
    {:else if data.isSearchPage}
      {#if searchValue}
        Результаты поиска "{searchValue}"
      {:else}
        Результаты поиска
      {/if}
    {:else}
      Каталог
    {/if}
  </h1>

  <ProductList
    {products}
    currentPage={data.page}
    pages={data.pages}
    currentSearch={data.currentSearch}
  />
</main>

<style lang="scss">
  .catalog-content {
    display: grid;
    gap: 16px;
  }
</style>
