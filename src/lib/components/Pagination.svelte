<script lang="ts" context="module">
  /**
   * Общий компонент пагинации.
   *
   * props:
   *   page        — текущая страница (1-based)
   *   totalPages  — всего страниц
   *   href        — базовый URL для ссылок (напр. /admin/orders).
   *                 Если задан → рендерит <a href="...?page=N"> (SSR-навигация).
   *                 Если нет → рендерит <button> и вызывает onPageChange(p).
   *   onPageChange — колбэк для button-режима
   */
</script>

<script lang="ts">
  export let page: number;
  export let totalPages: number;
  export let href: string | null = null;
  export let onPageChange: ((p: number) => void) | null = null;

  $: pages = buildPages(page, totalPages);

  function buildPages(current: number, total: number): (number | '...')[] {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const out: (number | '...')[] = [1];
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    if (start > 2) out.push('...');
    for (let i = start; i <= end; i++) out.push(i);
    if (end < total - 1) out.push('...');
    out.push(total);
    return out;
  }

  function pageHref(p: number) {
    return p === 1 ? href : `${href}?page=${p}`;
  }

  function handle(p: number) {
    onPageChange?.(p);
  }
</script>

{#if totalPages > 1}
  <div class="pagination">
    {#if page > 1}
      {#if href}
        <a class="pg-btn" href={pageHref(page - 1)} aria-label="Назад">‹</a>
      {:else}
        <button type="button" class="pg-btn" onclick={() => handle(page - 1)} aria-label="Назад">‹</button>
      {/if}
    {/if}

    {#each pages as p}
      {#if p === '...'}
        <span class="dots">...</span>
      {:else if href}
        <a class="pg-btn" class:active={p === page} href={pageHref(p as number)}>{p}</a>
      {:else}
        <button type="button" class="pg-btn" class:active={p === page} onclick={() => handle(p as number)}>{p}</button>
      {/if}
    {/each}

    {#if page < totalPages}
      {#if href}
        <a class="pg-btn" href={pageHref(page + 1)} aria-label="Вперёд">›</a>
      {:else}
        <button type="button" class="pg-btn" onclick={() => handle(page + 1)} aria-label="Вперёд">›</button>
      {/if}
    {/if}
  </div>
{/if}

<style lang="scss">
  .pagination {
    display: flex;
    gap: 6px;
    justify-content: center;
    flex-wrap: wrap;
  }
  .pg-btn {
    min-width: 38px;
    height: 38px;
    padding: 0 10px;
    border-radius: 10px;
    border: 1px solid #eee;
    background: #fff;
    color: #222;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 500;
    text-decoration: none;
    transition: 0.2s;
    cursor: pointer;
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
    display: inline-flex;
    align-items: center;
  }
</style>
