<script lang="ts">
  import ProductCard from '$lib/components/ProductCard.svelte';
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';

  export let data;

  const products = data.products ?? [];
  const brand = data.brand ?? null;
  const category = data.category ?? null;
  const type = data.type ?? null;
</script>

<Breadcrumbs {brand} {category} {type} />

<h1 class="title">
  {type || category || brand || 'Каталог'}
</h1>

{#if products.length === 0}
  <p>Товары не найдены</p>
{:else}
  <div class="grid gap-4">
    {#each products as product (product.id)}
      <ProductCard {product} />
    {/each}
  </div>
{/if}

<style>
  .title {
    font-size: 28px;
    margin-bottom: 20px;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  }
</style>
