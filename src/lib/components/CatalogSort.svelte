<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { ChevronDown, ChevronUp, Check } from 'lucide-svelte';

  // Сортировка каталога: самостоятельный блок, чтобы жить в шапке списка
  // (рядом с H1), а не в теле списка
  const sortOptions = [
    { value: 'default', label: 'По умолчанию' },
    { value: 'price_asc', label: 'Сначала дешевле' },
    { value: 'price_desc', label: 'Сначала дороже' }
  ];
  let isSortOpen = false;
  $: currentSort = $page.url.searchParams.get('sort') ?? 'default';
  $: currentSortLabel = sortOptions.find((item) => item.value === currentSort)?.label ?? 'По умолчанию';

  function applySort(sort: string) {
    const params = new URLSearchParams($page.url.searchParams);
    if (sort === 'default') params.delete('sort');
    else params.set('sort', sort);
    params.set('page', '1');
    isSortOpen = false;
    goto(`${$page.url.pathname}?${params.toString()}`, { keepFocus: true, noScroll: true });
  }
  function toggleSort() {
    isSortOpen = !isSortOpen;
  }
  function closeSort() {
    isSortOpen = false;
  }
</script>

<svelte:body onclick={closeSort} />

<div class="sort" onclick={(e) => e.stopPropagation()}>
  <button class="sort__trigger" type="button" onclick={toggleSort} aria-expanded={isSortOpen ? 'true' : 'false'}>
    <span>{currentSortLabel}</span>
    {#if isSortOpen}
      <ChevronUp size={18} strokeWidth={2.1} />
    {:else}
      <ChevronDown size={18} strokeWidth={2.1} />
    {/if}
  </button>
  {#if isSortOpen}
    <div class="sort__dropdown anim-drop-in">
      {#each sortOptions as option}
        <button class="sort__option" class:sort__option--active={option.value === currentSort} type="button" onclick={() => applySort(option.value)}>
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

<style lang="scss">
  .sort {
    position: relative;
    min-width: 0;
    flex: 0 1 186px;
    @media (min-width: 640px) {
      min-width: 200px;
      flex-shrink: 0;
    }
    .sort__trigger {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: $sp-2;
      width: 100%;
      min-height: 42px;
      padding: 0 $sp-3;
      border: 1.5px solid #111827;
      border-radius: 8px;
      background: #fff;
      color: #111827;
      font-size: 0.875rem;
      font-weight: 600;
      line-height: 1.2;
      cursor: pointer;
      transition: background 0.15s ease, border-color 0.15s ease;
      @media (min-width: 640px) {
        min-height: 46px;
        font-size: 0.9375rem;
      }
      &[aria-expanded='true'] {
        border-color: $yellow;
      }
      &:hover {
        background: #fafafa;
      }
      :global(svg) {
        flex: 0 0 auto;
      }
    }
    .sort__dropdown {
      position: absolute;
      top: calc(100% + $sp-2);
      right: 0;
      z-index: 20;
      width: 100%;
      overflow: hidden;
      border-radius: 8px;
      background: #fff;
      box-shadow: 0 10px 24px rgba(0, 0, 0, 0.1);
      border: 1px solid rgba(0, 0, 0, 0.06);
    }
    .sort__option {
      display: grid;
      grid-template-columns: 14px 1fr;
      align-items: center;
      gap: $sp-2;
      width: 100%;
      min-height: 46px;
      padding: 0 $sp-3;
      border: none;
      background: #fff;
      color: #111827;
      text-align: left;
      font-size: 0.9375rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s ease;
      &:hover {
        background: #f8fafc;
      }
      &.sort__option--active {
        background: #f8fafc;
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
</style>
