<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<script lang="ts">
  import { slide } from 'svelte/transition';
  import ColorFilter from '$lib/components/filters/ColorFilter.svelte';
  import CheckboxFilter from '$lib/components/filters/CheckboxFilter.svelte';
  import SliderFilter from '$lib/components/filters/SliderFilter.svelte';
  import { goto } from '$app/navigation';

  export let types: string[] = [];
  export let brands: string[] = [];
  export let colors: string[] = [];
  export let minPrice = 0;
  export let maxPrice = 100000;
  export let widthMin = 0;
  export let widthMax = 100;
  export let heightMin = 0;
  export let heightMax = 100;
  export let depthMin = 0;
  export let depthMax = 100;

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
        <CheckboxFilter items={types} param="type" />
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
          label="Цена"
          paramMin="price_min"
          paramMax="price_max"
          min={minPrice}
          max={maxPrice}
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
          label="Ширина"
          paramMin="width_min"
          paramMax="width_max"
          min={widthMin}
          max={widthMax}
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
          label="Высота"
          paramMin="height_min"
          paramMax="height_max"
          min={heightMin}
          max={heightMax}
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
          label="Глубина"
          paramMin="depth_min"
          paramMax="depth_max"
          min={depthMin}
          max={depthMax}
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
