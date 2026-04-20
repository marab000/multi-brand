<script lang="ts">
  import { slide } from 'svelte/transition';
  import ColorFilter from '$lib/components/filters/ColorFilter.svelte';
  import CheckboxFilter from '$lib/components/filters/CheckboxFilter.svelte';
  import SliderFilter from '$lib/components/filters/SliderFilter.svelte';
  import CategoryNav from '$lib/components/filters/CategoryNav.svelte';
  import { goto } from '$app/navigation';
  import TypeFilter from '$lib/components/filters/TypeFilter.svelte';

  type TypeItem = { name: string; slug: string };
  type TypeGroup = { group: string; items: TypeItem[] };
  type CategoryNavItem = { name: string; slug: string; href: string; level: 'group' | 'leaf' };
  type MinMax = {
    price: [number, number];
    width: [number, number];
    height: [number, number];
    depth: [number, number];
  };

  let {
    categoryNav = [],
    typeGroups = [],
    brands = [],
    colors = [],
    minMax = {
      price: [0, 0],
      width: [0, 0],
      height: [0, 0],
      depth: [0, 0]
    }
  } = $props<{
    categoryNav?: CategoryNavItem[];
    typeGroups?: TypeGroup[];
    brands?: string[];
    colors?: string[];
    minMax?: MinMax;
  }>();

  let showCategories = $state(true);
  let showTypes = $state(true);
  let showBrands = $state(true);
  let showColors = $state(true);
  let showPrice = $state(true);
  let showWidth = $state(true);
  let showHeight = $state(true);
  let showDepth = $state(true);

  const hasCategoryNav = $derived(categoryNav.length > 1);
  const hasPrice = $derived((minMax?.price?.[1] ?? 0) > (minMax?.price?.[0] ?? 0));
  const hasWidth = $derived((minMax?.width?.[1] ?? 0) > (minMax?.width?.[0] ?? 0));
  const hasHeight = $derived((minMax?.height?.[1] ?? 0) > (minMax?.height?.[0] ?? 0));
  const hasDepth = $derived((minMax?.depth?.[1] ?? 0) > (minMax?.depth?.[0] ?? 0));
  const hasMeaningfulTypeGroups = $derived(
    typeGroups.length > 1 || typeGroups.some((group: any) => group.items.length > 1)
  );

  function resetFilters() {
    goto('?');
  }
</script>

<div class="filters">
  <div class="content">
    {#if hasCategoryNav}
      <div class="filter-block">
        <button class="filter-title" onclick={() => (showCategories = !showCategories)}>
          Категории <span class:rotated={!showCategories}>⌄</span>
        </button>
        {#if showCategories}
          <div class="filter-content" transition:slide>
            <CategoryNav items={categoryNav} />
          </div>
        {/if}
      </div>
    {/if}

    {#if brands.length}
      <div class="filter-block brand">
        <button class="filter-title" onclick={() => (showBrands = !showBrands)}>
          Бренд <span class:rotated={!showBrands}>⌄</span>
        </button>
        {#if showBrands}
          <div class="filter-content scroll" transition:slide>
            <CheckboxFilter items={brands} param="brand" />
          </div>
        {/if}
      </div>
    {/if}

    {#if hasMeaningfulTypeGroups}
      <div class="filter-block">
        <button class="filter-title" onclick={() => (showTypes = !showTypes)}>
          Тип товара <span class:rotated={!showTypes}>⌄</span>
        </button>
        {#if showTypes}
          <div class="filter-content scroll" transition:slide>
            <TypeFilter groups={typeGroups} />
          </div>
        {/if}
      </div>
    {/if}

    {#if colors.length}
      <div class="filter-block">
        <button class="filter-title" onclick={() => (showColors = !showColors)}>
          Цвет <span class:rotated={!showColors}>⌄</span>
        </button>
        {#if showColors}
          <div class="filter-content scroll" transition:slide>
            <ColorFilter {colors} />
          </div>
        {/if}
      </div>
    {/if}

    {#if hasPrice}
      <div class="filter-block">
        <button class="filter-title" onclick={() => (showPrice = !showPrice)}>
          Цена <span class:rotated={!showPrice}>⌄</span>
        </button>
        {#if showPrice}
          <div class="filter-content" transition:slide>
            {#key minMax.price[1]}
              <SliderFilter
                paramMin="price_min"
                paramMax="price_max"
                min={minMax.price[0]}
                max={minMax.price[1]}
              />
            {/key}
          </div>
        {/if}
      </div>
    {/if}

    {#if hasWidth}
      <div class="filter-block">
        <button class="filter-title" onclick={() => (showWidth = !showWidth)}>
          Ширина <span class:rotated={!showWidth}>⌄</span>
        </button>
        {#if showWidth}
          <div class="filter-content" transition:slide>
            {#key minMax.width[1]}
              <SliderFilter
                paramMin="width_min"
                paramMax="width_max"
                min={minMax.width[0]}
                max={minMax.width[1]}
              />
            {/key}
          </div>
        {/if}
      </div>
    {/if}

    {#if hasHeight}
      <div class="filter-block">
        <button class="filter-title" onclick={() => (showHeight = !showHeight)}>
          Высота <span class:rotated={!showHeight}>⌄</span>
        </button>
        {#if showHeight}
          <div class="filter-content" transition:slide>
            {#key minMax.height[1]}
              <SliderFilter
                paramMin="height_min"
                paramMax="height_max"
                min={minMax.height[0]}
                max={minMax.height[1]}
              />
            {/key}
          </div>
        {/if}
      </div>
    {/if}

    {#if hasDepth}
      <div class="filter-block">
        <button class="filter-title" onclick={() => (showDepth = !showDepth)}>
          Глубина <span class:rotated={!showDepth}>⌄</span>
        </button>
        {#if showDepth}
          <div class="filter-content" transition:slide>
            {#key minMax.depth[1]}
              <SliderFilter
                paramMin="depth_min"
                paramMax="depth_max"
                min={minMax.depth[0]}
                max={minMax.depth[1]}
              />
            {/key}
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <button class="reset-btn" onclick={resetFilters}>Сбросить фильтры</button>
</div>

<style lang="scss">
  @use 'sass:color';
  .filters {
    display: flex;
    flex-direction: column;
    @media (max-width: 1023px) {
      height: 100%;
    }
    .content {
      flex: 1;
      overflow: auto;
      padding-right: 4px;
    }
    .filter-block {
      border: 1px solid #eee;
      border-radius: 10px;
      overflow: hidden;
      background: #fff;
      @media (min-width: 1024px) {
        &:first-child {
          margin-top: 0;
        }
        margin: 20px 0;
      }
      @media (max-width: 1023px) {
        margin: 12px 0;
      }
      .filter-title {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        padding: 12px 14px;
        font-weight: 600;
        cursor: pointer;
        background: #fafafa;
        &:hover {
          background: color.scale(#fafafa, $lightness: -3%);
        }
        span {
          transition: 0.2s;
          transform: rotate(-90deg);
        }
        .rotated {
          transform: rotate(0);
        }
      }
      .filter-content {
        &:not(.scroll) {
          padding: 10px 12px;
        }
        &.scroll {
          padding: 10px 0 12px 10px;
          :global(.group) {
            margin-right: 10px;
          }
        }
        :global(.filter-body) {
          max-height: 400px;
          overflow: auto;
          display: grid;
          gap: 8px;
        }
        :global(.group) {
          border: 1px solid #eee;
          border-radius: 10px;
          overflow: hidden;
        }
        :global(.row) {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          background: #fafafa;
          cursor: pointer;
          &:hover {
            background: #f3f3f3;
          }
        }
        :global(.label) {
          flex: 1;
          display: flex;
          align-items: center;
          cursor: pointer;
          line-height: 1;
          text-align: left;
        }
        :global(.arrow) {
          margin-left: auto;
          transition: 0.2s;
          transform: rotate(0);
          font-size: 12px;
        }
        :global(.arrow.open) {
          transform: rotate(-90deg) !important;
        }
        :global(.check),
        :global(.subcheck) {
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #bbb;
          border-radius: 4px;
          background: #fff;
        }
        :global(.check) {
          width: 16px;
          height: 16px;
          min-width: 16px;
        }
        :global(.subcheck) {
          width: 14px;
          height: 14px;
          min-width: 14px;
        }
        :global(.check.checked) {
          background: $yellow;
          border-color: $yellow;
        }
        :global(.subcheck.checked) {
          background: rgba($yellow, 0.5);
          border-color: rgba($yellow, 1);
        }
        :global(.check.partial) {
          background: linear-gradient(135deg, rgba($yellow, 1) 40%, rgba($yellow, 0) 60%);
          border-color: $yellow;
        }
        :global(.sub) {
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          text-align: left;
          width: 100%;
          gap: 10px;
          padding: 8px 8px 8px 20px;
          cursor: pointer;
          &:hover {
            background: #f7f7f7;
          }
        }
      }
      &.brand {
        :global(.row) {
          font-size: 0.9rem;
          line-height: 1;
        }
      }
    }
    .reset-btn {
      margin-top: 10px;
      padding: 12px;
      border-radius: 10px;
      border: none;
      background: $yellow;
      font-weight: 600;
      cursor: pointer;
      transition: 0.2s;
      &:hover {
        opacity: 0.9;
      }
    }
  }
</style>
