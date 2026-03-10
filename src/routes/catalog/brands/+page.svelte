<script lang="ts">
  export let data;
  $: brands = data.brands ?? [];
</script>

<h1 class="title mb-3" style="font-size: 24px;">Бренды</h1>

{#if brands.length === 0}
  <p>Бренды не найдены</p>
{:else}
  <div class="brands">
    {#each brands as brand}
      <a class="brand" href={`/catalog/brands/${brand.brand_name.toLowerCase()}`}>
        {brand.brand_name}
      </a>
    {/each}
  </div>
{/if}

<style lang="scss">
  .brands {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
  }
  .brand {
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #ccc;
    border-radius: 8px;
    height: 80px;
    text-decoration: none;
    color: black;
    font-weight: 600;
    transition: 0.2s;
  }
  .brand:hover {
    background: #f5f5f5;
  }
</style>
