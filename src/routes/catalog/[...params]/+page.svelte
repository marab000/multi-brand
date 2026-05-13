<script lang="ts">
  import type { PageData } from './$types';
  import ProductList from '$lib/components/ProductList.svelte';
  import { page } from '$app/stores';
  export let data: PageData;
  $: products = data.products ?? [];
  $: searchValue = data.isSearchPage
    ? (new URLSearchParams(data.currentSearch ?? '').get('search')?.trim() ?? '')
    : '';
  $: resetHref = $page.url.pathname;
</script>

<main class="catalog-content">
  <h1 class="title text-[24px]!">
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

  {#if products.length}
    <ProductList
      {products}
      currentPage={data.page}
      pages={data.pages}
      currentSearch={data.currentSearch}
    />
  {:else}
    <div class="empty-state">
      <div class="empty-state__title">Товаров в таком сочетании не нашлось</div>
      <div class="empty-state__text">
        Попробуйте убрать часть фильтров или вернуться к разделу без ограничений.
      </div>
      <a class="reset-btn px-10!" href={resetHref}>Сбросить фильтры</a>
    </div>
  {/if}
</main>

<style lang="scss">
  .catalog-content {
    display: grid;
    gap: 16px;
  }
  .empty-state {
    min-height: 360px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 42px 20px;
    border: 1px solid #eee;
    border-radius: 16px;
    background: #fff;
    text-align: center;
    .empty-state__title {
      font-size: 20px;
      font-weight: 700;
      line-height: 1.2;
      color: #151515;
    }
    .empty-state__text {
      max-width: 420px;
      font-size: 14px;
      line-height: 1.45;
      color: #666;
    }
    .reset-btn {
      margin-top: 10px;
      padding: 12px;
      border-radius: 10px;
      border: none;
      background: $yellow;
      font-weight: 600;
      cursor: pointer;
      transition: 0.2s;
      &:hover {
        opacity: 0.9;
      }
    }
  }
</style>
