<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<script lang="ts">
  import { slide } from 'svelte/transition';
  import ColorFilter from '$lib/components/filters/ColorFilter.svelte';
  import CheckboxFilter from '$lib/components/filters/CheckboxFilter.svelte';
  import SliderFilter from '$lib/components/filters/SliderFilter.svelte';
  import { goto } from '$app/navigation';
  import TypeFilter from '$lib/components/filters/TypeFilter.svelte';

  export let typeGroups: { group: string; items: string[] }[] = [];
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
  <div class="filter-block">
    <div class="filter-title" on:click={() => (showBrands = !showBrands)}>
      Бренд <span class:rotated={!showBrands}>⌄</span>
    </div>
    {#if showBrands}
      <div class="filter-content" transition:slide>
        <CheckboxFilter items={brands} param="brand" />
      </div>
    {/if}
  </div>

  <div class="filter-block">
    <div class="filter-title" on:click={() => (showTypes = !showTypes)}>
      Тип <span class:rotated={!showTypes}>⌄</span>
    </div>
    {#if showTypes}
      <div class="filter-content" transition:slide>
        <TypeFilter groups={typeGroups} />
      </div>
    {/if}
  </div>

  <div class="filter-block">
    <div class="filter-title" on:click={() => (showColors = !showColors)}>
      Цвет <span class:rotated={!showColors}>⌄</span>
    </div>
    {#if showColors}
      <div class="filter-content" transition:slide>
        <ColorFilter {colors} />
      </div>
    {/if}
  </div>

  <div class="filter-block">
    <div class="filter-title" on:click={() => (showPrice = !showPrice)}>
      Цена <span class:rotated={!showPrice}>⌄</span>
    </div>
    {#if showPrice}
      <div class="filter-content" transition:slide>
        <SliderFilter
          paramMin="price_min"
          paramMax="price_max"
          min={minMax.price[0]}
          max={minMax.price[1]}
        />
      </div>
    {/if}
  </div>

  <div class="filter-block">
    <div class="filter-title" on:click={() => (showWidth = !showWidth)}>
      Ширина <span class:rotated={!showWidth}>⌄</span>
    </div>
    {#if showWidth}
      <div class="filter-content" transition:slide>
        <SliderFilter
          paramMin="width_min"
          paramMax="width_max"
          min={0}
          max={minMax.width[1]}
          step={0.1}
        />
      </div>
    {/if}
  </div>

  <div class="filter-block">
    <div class="filter-title" on:click={() => (showHeight = !showHeight)}>
      Высота <span class:rotated={!showHeight}>⌄</span>
    </div>
    {#if showHeight}
      <div class="filter-content" transition:slide>
        <SliderFilter
          paramMin="height_min"
          paramMax="height_max"
          min={0}
          max={minMax.height[1]}
          step={0.1}
        />
      </div>
    {/if}
  </div>

  <div class="filter-block">
    <div class="filter-title" on:click={() => (showDepth = !showDepth)}>
      Глубина <span class:rotated={!showDepth}>⌄</span>
    </div>
    {#if showDepth}
      <div class="filter-content" transition:slide>
        <SliderFilter
          paramMin="depth_min"
          paramMax="depth_max"
          min={0}
          max={minMax.depth[1]}
          step={0.1}
        />
      </div>
    {/if}
  </div>

  <button class="reset-btn" on:click={resetFilters}>Сбросить фильтры</button>
</div>

<style lang="scss">
  .filters {
    display: flex;
    flex-direction: column;
    gap: 24px;
    .filter-block {
      display: flex;
      flex-direction: column;
      .filter-title {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: 600;
        cursor: pointer;
        span {
          transition: 0.25s;
        }
        .rotated {
          transform: rotate(-180deg);
        }
      }
      .filter-content {
        margin-top: 8px;
      }
    }
    .reset-btn {
      margin-top: 12px;
      padding: 8px 12px;
      background: #eee;
      border: 1px solid #ccc;
      cursor: pointer;
      border-radius: 4px;
      &:hover {
        background: #ddd;
      }
    }
  }
</style>
