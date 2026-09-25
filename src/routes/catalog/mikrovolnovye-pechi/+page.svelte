<svelte:head>
  <title>Микроволновые печи в Казани | MULTIBRAND</title>
  <meta name="description" content="Микроволновые печи в интернет-магазине MULTIBRAND Казань. Встраиваемые и соло СВЧ-печи с доставкой по Казани и России, гарантия производителя." />
  {#if data.page > 1}
    <meta name="robots" content="noindex, follow" />
  {/if}
</svelte:head>

<script lang="ts">
  import ProductList from '$lib/components/ProductList.svelte';
  import type { PageData } from './$types';
  export let data: PageData;
  $: products = data.products ?? [];
</script>

<main class="catalog-content">
  <h1 class="title text-[24px]!">{data.title}</h1>
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
