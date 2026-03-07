<script lang="ts">
  import { slugify } from '/Users/maratnugmanov/Documents/Projects/multi-brand/src/lib/utils/slugify';
  export let brand: string | null = null;
  export let category: string | null = null;
  export let type: string | null = null;
</script>

<nav class="breadcrumbs">
  <a href="/catalog/brands">Каталог</a>

  {#if brand}
    <span class="sep">›</span>
    <a href={`/catalog/brands/${slugify(brand!)}`}>{brand}</a>
  {/if}

  {#if category}
    <span class="sep">›</span>
    <a href={`/catalog/brands/${slugify(brand!)}/${slugify(category!)}`}>{category}</a>
  {/if}

  {#if type}
    <span class="sep">›</span>
    <span>{type}</span>
  {/if}
</nav>

<style lang="scss">
  .breadcrumbs {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  .sep {
    opacity: 0.5;
  }
</style>
