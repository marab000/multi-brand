<script lang="ts">
  import ColorFilter from '$lib/components/filters/ColorFilter.svelte';
  import CheckboxFilter from '$lib/components/filters/CheckboxFilter.svelte';
  import SliderFilter from '$lib/components/filters/SliderFilter.svelte';
  import CategoryNav from '$lib/components/filters/CategoryNav.svelte';
  import { goto } from '$app/navigation';
  import TypeFilter from '$lib/components/filters/TypeFilter.svelte';
  type TypeItem = { name: string; slug: string };
  type TypeGroup = { group: string; items: TypeItem[] };
  type CategoryNavItem = {
    name: string;
    slug: string;
    href: string;
    level: 'root' | 'group' | 'leaf';
    parentSlug?: string;
    rootSlug?: string;
    groupSlug?: string;
  };
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
  const hasCategoryNav = $derived(categoryNav.length > 0);
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
        <div class="filter-title">Категории</div>
        <div class="filter-content">
          <CategoryNav items={categoryNav} />
        </div>
      </div>
    {/if}
    {#if brands.length}
      <div class="filter-block brand">
        <div class="filter-title">Бренд</div>
        <div class="filter-content scroll">
          <CheckboxFilter items={brands} param="brand" />
        </div>
      </div>
    {/if}
    {#if hasMeaningfulTypeGroups}
      <div class="filter-block">
        <div class="filter-title">Тип товара</div>
        <div class="filter-content scroll">
          <TypeFilter groups={typeGroups} />
        </div>
      </div>
    {/if}
    {#if colors.length}
      <div class="filter-block">
        <div class="filter-title">Цвет</div>
        <div class="filter-content scroll">
          <ColorFilter {colors} />
        </div>
      </div>
    {/if}
    {#if hasPrice}
      <div class="filter-block">
        <div class="filter-title">Цена</div>
        <div class="filter-content">
          {#key minMax.price[1]}
            <SliderFilter
              paramMin="price_min"
              paramMax="price_max"
              min={minMax.price[0]}
              max={minMax.price[1]}
            />
          {/key}
        </div>
      </div>
    {/if}
    {#if hasWidth}
      <div class="filter-block">
        <div class="filter-title">Ширина</div>
        <div class="filter-content">
          {#key minMax.width[1]}
            <SliderFilter
              paramMin="width_min"
              paramMax="width_max"
              min={minMax.width[0]}
              max={minMax.width[1]}
            />
          {/key}
        </div>
      </div>
    {/if}
    {#if hasHeight}
      <div class="filter-block">
        <div class="filter-title">Высота</div>
        <div class="filter-content">
          {#key minMax.height[1]}
            <SliderFilter
              paramMin="height_min"
              paramMax="height_max"
              min={minMax.height[0]}
              max={minMax.height[1]}
            />
          {/key}
        </div>
      </div>
    {/if}
    {#if hasDepth}
      <div class="filter-block">
        <div class="filter-title">Глубина</div>
        <div class="filter-content">
          {#key minMax.depth[1]}
            <SliderFilter
              paramMin="depth_min"
              paramMax="depth_max"
              min={minMax.depth[0]}
              max={minMax.depth[1]}
            />
          {/key}
        </div>
      </div>
    {/if}
  </div>
  <button class="reset-btn lg:mb-8" onclick={resetFilters}>Сбросить фильтры</button>
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
        background: #fafafa;
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
