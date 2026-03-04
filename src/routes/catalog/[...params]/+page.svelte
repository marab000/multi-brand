<script lang="ts">
  import ProductCard from '$lib/components/ProductCard.svelte';
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';

  export let data;

  // 🔥 делаем реактивными
  $: products = data.products ?? [];
  $: brand = data.brand ?? null;
  $: category = data.category ?? null;
  $: type = data.type ?? null;

  $: total = data.total ?? 0;
  $: currentPage = data.page ?? 1;
  $: pages = data.pages ?? 1;
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
    const params = new URLSearchParams(data.currentSearch);
    params.set('page', String(p));
    return `?${params.toString()}`;
  }
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

  {#if pages > 1}
    <div class="pagination">
      {#if currentPage > 1}
        <a href={buildPageLink(currentPage - 1)}> ‹ </a>
      {/if}

      {#each visiblePages as p}
        {#if p === '...'}
          <span class="dots">...</span>
        {:else}
          <a href={buildPageLink(p as number)} class:active={p === currentPage}>
            {p}
          </a>
        {/if}
      {/each}

      {#if currentPage < pages}
        <a href={buildPageLink(currentPage + 1)}> › </a>
      {/if}
    </div>
  {/if}
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

  .pagination {
    display: flex;
    gap: 8px;
    margin-top: 30px;
    justify-content: center;
    align-items: center;
    flex-wrap: wrap;
  }

  .pagination a {
    padding: 8px 12px;
    border: 1px solid #ccc;
    border-radius: 50%;
    background: white;
    text-decoration: none;
    color: black;
    min-width: 38px;
    text-align: center;
  }

  .pagination a.active {
    background: black;
    color: white;
    border-color: black;
  }

  .pagination .dots {
    padding: 0 6px;
    color: #777;
  }
</style>
