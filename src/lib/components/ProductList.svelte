<script lang="ts">
  import ProductCard from '$lib/components/ProductCard.svelte';

  export let products: any = [];
  export let total = 0;
  export let currentPage = 1;
  export let pages = 1;
  export let currentSearch = {};

  $: visiblePages = getVisiblePages(currentPage, pages);

  function getVisiblePages(current: number, total: number): (number | '...')[] {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const result: (number | '...')[] = [];
    result.push(1);
    let start = Math.max(2, current - 2);
    let end = Math.min(total - 1, current + 2);
    if (current <= 3) {
      start = 2;
      end = 5;
    }
    if (current >= total - 2) {
      start = total - 4;
      end = total - 1;
    }
    if (start > 2) {
      result.push('...');
    }
    for (let i = start; i <= end; i++) {
      result.push(i);
    }
    if (end < total - 1) {
      result.push('...');
    }
    result.push(total);
    return result;
  }

  function buildPageLink(p: number) {
    const params = new URLSearchParams(currentSearch);
    params.set('page', String(p));
    return `?${params.toString()}`;
  }
</script>

{#if products.length === 0}
  <p>Товары не найдены</p>
{:else}
  <div class="grid">
    {#each products as product (product.id)}
      <ProductCard {product} />
    {/each}
  </div>

  {#if pages > 1}
    <div class="pagination">
      {#if currentPage > 1}
        <a href={buildPageLink(currentPage - 1)}>‹</a>
      {/if}

      {#each visiblePages as p}
        {#if p === '...'}
          <span class="dots">...</span>
        {:else}
          <a href={buildPageLink(p as number)} class:active={p === currentPage}>{p}</a>
        {/if}
      {/each}

      {#if currentPage < pages}
        <a href={buildPageLink(currentPage + 1)}>›</a>
      {/if}
    </div>
  {/if}
{/if}

<style lang="scss">
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
    gap: 16px;
  }

  .pagination {
    display: flex;
    gap: 6px;
    margin-top: 30px;
    justify-content: center;
    flex-wrap: wrap;

    a {
      min-width: 38px;
      height: 38px;
      padding: 0 10px;
      border-radius: 10px;
      border: 1px solid #eee;
      background: #fff;
      text-decoration: none;
      color: #222;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 500;
      transition: 0.2s;

      &:hover {
        background: #f5f5f5;
      }

      &.active {
        background: $green;
        color: #fff;
        border-color: $green;
      }
    }

    .dots {
      padding: 0 8px;
      color: #aaa;
    }
  }
</style>
