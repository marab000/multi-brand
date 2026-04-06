<script lang="ts">
  import ProductList from '$lib/components/ProductList.svelte';
  export let data;
  $: products = data.products ?? [];
</script>

<main class="catalog-content">
  <h1 class="title" style="font-size:24px">
    {data.category || 'Каталог'}
  </h1>

  <ProductList
    {products}
    total={data.total}
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
