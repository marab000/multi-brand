<script lang="ts">
  import ProductList from '$lib/components/ProductList.svelte';

  export let data;

  $: products = data.products ?? [];
</script>

<h1 class="title mb-3" style="font-size: 24px;">
  {data.type || data.category || 'Каталог'}
</h1>

<ProductList
  {products}
  total={data.total}
  currentPage={data.page}
  pages={data.pages}
  currentSearch={data.currentSearch}
/>
