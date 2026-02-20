<script lang="ts">
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
  export let data;
  const p = data.product;
</script>

{#if !p}
  <p>Not found</p>
{:else}
  <Breadcrumbs brand={p.brand_name} category={p.category} type={p.product_type} />

  <h1>{p.name}</h1>

  <div class="gallery">
    {#each p.images as img}
      <img src={img.url} alt="" />
    {/each}
  </div>

  <p class="price">{p.price} ₽</p>
{/if}

<style>
  .gallery img {
    max-width: 300px;
  }
  .price {
    font-size: 24px;
    font-weight: bold;
  }
</style>
