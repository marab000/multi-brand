<script lang="ts">
  import ProductCard from '$lib/components/ProductCard.svelte';
  export let data;
  $: products = data.products ?? [];
  $: category = data.category ?? null;
  $: type = data.type ?? null;
</script>

<h1 class="title">
  {#if type}
    {type}
  {:else if category}
    {category}
  {:else}
    Каталог
  {/if}
</h1>

{#if products.length === 0}
  <p>Товары не найдены</p>
{:else}
  <div class="grid">
    {#each products as product (product.id)}
      <ProductCard {product} />
    {/each}
  </div>
{/if}

<style lang="scss">
  .title {
    font-size: 28px;
    margin-bottom: 20px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
    gap: 16px;
  }
</style>
