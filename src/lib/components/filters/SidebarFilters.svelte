<script lang="ts">
  import { slide } from 'svelte/transition';
  import ColorFilter from '$lib/components/filters/ColorFilter.svelte';
  import CheckboxFilter from '$lib/components/filters/CheckboxFilter.svelte';
  import SliderFilter from '$lib/components/filters/SliderFilter.svelte';
  import { goto } from '$app/navigation';
  import TypeFilter from '$lib/components/filters/TypeFilter.svelte';

  type TypeItem = { name: string; slug: string };
  type TypeGroup = { group: string; items: TypeItem[] };

  export let typeGroups: TypeGroup[] = [];
  export let brands: string[] = [];
  export let colors: string[] = [];
  export let minMax;

  let showTypes = true;
  let showBrands = true;
  let showColors = true;
  let showPrice = true;
  let showWidth = true;
  let showHeight = true;
  let showDepth = true;

  function resetFilters() {
    goto('?');
  }
</script>

<div class="filters">
  <div class="content">
    <div class="filter-block brand">
      <button class="filter-title" on:click={() => (showBrands = !showBrands)}>
        Бренд <span class:rotated={!showBrands}>⌄</span>
      </button>
      {#if showBrands}
        <div class="filter-content scroll" transition:slide>
          <CheckboxFilter items={brands} param="brand" />
        </div>
      {/if}
    </div>

    <div class="filter-block">
      <button class="filter-title" on:click={() => (showTypes = !showTypes)}>
        Тип <span class:rotated={!showTypes}>⌄</span>
      </button>
      {#if showTypes}
        <div class="filter-content scroll" transition:slide>
          <TypeFilter groups={typeGroups} />
        </div>
      {/if}
    </div>

    <div class="filter-block">
      <button class="filter-title" on:click={() => (showColors = !showColors)}>
        Цвет <span class:rotated={!showColors}>⌄</span>
      </button>
      {#if showColors}
        <div class="filter-content scroll" transition:slide>
          <ColorFilter {colors} />
        </div>
      {/if}
    </div>

    <div class="filter-block">
      <button class="filter-title" on:click={() => (showPrice = !showPrice)}>
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

    <div class="filter-block">
      <button class="filter-title" on:click={() => (showWidth = !showWidth)}>
        Ширина <span class:rotated={!showWidth}>⌄</span>
      </button>
      {#if showWidth}
        <div class="filter-content" transition:slide>
          {#key minMax.width[1]}
            <SliderFilter paramMin="width_min" paramMax="width_max" min={0} max={minMax.width[1]} />
          {/key}
        </div>
      {/if}
    </div>

    <div class="filter-block">
      <button class="filter-title" on:click={() => (showHeight = !showHeight)}>
        Высота <span class:rotated={!showHeight}>⌄</span>
      </button>
      {#if showHeight}
        <div class="filter-content" transition:slide>
          {#key minMax.height[1]}
            <SliderFilter
              paramMin="height_min"
              paramMax="height_max"
              min={0}
              max={minMax.height[1]}
            />
          {/key}
        </div>
      {/if}
    </div>

    <div class="filter-block">
      <button class="filter-title" on:click={() => (showDepth = !showDepth)}>
        Глубина <span class:rotated={!showDepth}>⌄</span>
      </button>
      {#if showDepth}
        <div class="filter-content" transition:slide>
          {#key minMax.depth[1]}
            <SliderFilter paramMin="depth_min" paramMax="depth_max" min={0} max={minMax.depth[1]} />
          {/key}
        </div>
      {/if}
    </div>
  </div>

  <button class="reset-btn" on:click={resetFilters}>Сбросить фильтры</button>
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
          width: 100%;
          gap: 10px;
          padding: 8px 28px;
          cursor: pointer;
          &:hover {
            background: #f7f7f7;
          }
        }
      }
      &.brand {
        :global(.row) {
          font-size: 0.9rem;
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
