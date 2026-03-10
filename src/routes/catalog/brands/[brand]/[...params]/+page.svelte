<script lang="ts">
  import ProductList from '$lib/components/ProductList.svelte';
  export let data;
  $: brand = data.brand ?? null;
  $: category = data.category ?? null;
  $: type = data.type ?? null;
</script>

<h1 class="title mb-3" style="font-size: 24px;">{type || category || brand || 'Каталог'}</h1>

<ProductList
  products={data.products}
  total={data.total}
  currentPage={data.page}
  pages={data.pages}
  currentSearch={data.currentSearch}
/>

<style lang="scss">
</style>
