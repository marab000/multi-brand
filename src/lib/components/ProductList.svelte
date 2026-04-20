<script lang="ts">
  import { ChevronDown, ChevronUp, Check } from 'lucide-svelte';
  import ProductCard from '$lib/components/ProductCard.svelte';

  export let products: any[] = [];
  export let currentPage = 1;
  export let pages = 1;
  export let currentSearch = '';

  const sortOptions = [
    { value: 'default', label: 'По умолчанию' },
    { value: 'price_asc', label: 'Сначала дешевле' },
    { value: 'price_desc', label: 'Сначала дороже' }
  ];

  let isSortOpen = false;

  $: currentSort = new URLSearchParams(currentSearch).get('sort') ?? 'default';
  $: currentSortLabel =
    sortOptions.find((item) => item.value === currentSort)?.label ?? 'По умолчанию';
  $: visiblePages = getVisiblePages(currentPage, pages);

  function getVisiblePages(current: number, total: number): (number | '...')[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
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
    if (start > 2) result.push('...');
    for (let i = start; i <= end; i++) result.push(i);
    if (end < total - 1) result.push('...');
    result.push(total);
    return result;
  }

  function buildPageLink(p: number) {
    const params = new URLSearchParams(currentSearch);
    params.set('page', String(p));
    return `?${params.toString()}`;
  }

  function applySort(sort: string) {
    const params = new URLSearchParams(currentSearch);
    if (sort === 'default') params.delete('sort');
    else params.set('sort', sort);
    params.set('page', '1');
    isSortOpen = false;
    window.location.search = params.toString();
  }

  function toggleSort() {
    isSortOpen = !isSortOpen;
  }

  function closeSort() {
    isSortOpen = false;
  }
</script>

<svelte:body onclick={closeSort} />

{#if products.length === 0}
  <p>Товары не найдены</p>
{:else}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="topbar">
    <div class="sort" onclick={(e) => e.stopPropagation()}>
      <button
        class="sort__trigger"
        type="button"
        onclick={toggleSort}
        aria-expanded={isSortOpen ? 'true' : 'false'}
      >
        <span>{currentSortLabel}</span>
        {#if isSortOpen}
          <ChevronUp size={18} strokeWidth={2.1} />
        {:else}
          <ChevronDown size={18} strokeWidth={2.1} />
        {/if}
      </button>

      {#if isSortOpen}
        <div class="sort__dropdown">
          {#each sortOptions as option}
            <button
              class="sort__option"
              class:sort__option--active={option.value === currentSort}
              type="button"
              onclick={() => applySort(option.value)}
            >
              <span class="sort__check">
                {#if option.value === currentSort}
                  <Check size={18} strokeWidth={2.4} />
                {/if}
              </span>
              <span>{option.label}</span>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </div>

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
  .topbar {
    display: flex;
    justify-content: flex-end;
  }
  .sort {
    position: relative;
    min-width: 200px;
    .sort__trigger {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      width: 100%;
      min-height: 46px;
      padding: 0 14px;
      border: 1.5px solid #2e3437;
      border-radius: 10px;
      background: #fff;
      color: #2e3437;
      font-size: 0.95rem;
      font-weight: 500;
      line-height: 1.2;
      &[aria-expanded='true'] {
        border-color: #e6a73c;
      }
      cursor: pointer;
      transition:
        background 0.18s ease,
        border-color 0.18s ease;
      &:hover {
        background: #fafafa;
      }
      :global(svg) {
        flex: 0 0 auto;
      }
    }
    .sort__dropdown {
      position: absolute;
      top: calc(100% + 8px);
      left: 0;
      z-index: 20;
      width: 100%;
      overflow: hidden;
      border-radius: 10px;
      background: #fff;
      box-shadow: 0 10px 24px rgba(0, 0, 0, 0.1);
      border: 1px solid rgba(0, 0, 0, 0.06);
    }
    .sort__option {
      display: grid;
      grid-template-columns: 14px 1fr;
      align-items: center;
      gap: 10px;
      width: 100%;
      min-height: 46px;
      padding: 0 14px;
      border: none;
      background: #fff;
      color: #111;
      text-align: left;
      font-size: 0.95rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.18s ease;
      &:hover {
        background: #f3f1ee;
      }
      &.sort__option--active {
        background: #f3f1ee;
      }
    }
    .sort__check {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      min-width: 18px;
      height: 18px;
    }
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(235px, 1fr));
    gap: 8px;
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
