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

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->

<div class="filters">
  <div class="filter-block">
    <div class="filter-title" on:click={() => (showBrands = !showBrands)}>
      Бренд <span class:rotated={!showBrands}>⌄</span>
    </div>
    {#if showBrands}
      <div class="filter-content scroll" transition:slide>
        <CheckboxFilter items={brands} param="brand" />
      </div>
    {/if}
  </div>

  <div class="filter-block">
    <div class="filter-title" on:click={() => (showTypes = !showTypes)}>
      Тип <span class:rotated={!showTypes}>⌄</span>
    </div>
    {#if showTypes}
      <div class="filter-content scroll" transition:slide>
        <TypeFilter groups={typeGroups} />
      </div>
    {/if}
  </div>

  <div class="filter-block">
    <div class="filter-title" on:click={() => (showColors = !showColors)}>
      Цвет <span class:rotated={!showColors}>⌄</span>
    </div>
    {#if showColors}
      <div class="filter-content scroll" transition:slide>
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
        <SliderFilter paramMin="width_min" paramMax="width_max" min={0} max={minMax.width[1]} />
      </div>
    {/if}
  </div>

  <div class="filter-block">
    <div class="filter-title" on:click={() => (showHeight = !showHeight)}>
      Высота <span class:rotated={!showHeight}>⌄</span>
    </div>
    {#if showHeight}
      <div class="filter-content" transition:slide>
        <SliderFilter paramMin="height_min" paramMax="height_max" min={0} max={minMax.height[1]} />
      </div>
    {/if}
  </div>

  <div class="filter-block">
    <div class="filter-title" on:click={() => (showDepth = !showDepth)}>
      Глубина <span class:rotated={!showDepth}>⌄</span>
    </div>
    {#if showDepth}
      <div class="filter-content" transition:slide>
        <SliderFilter paramMin="depth_min" paramMax="depth_max" min={0} max={minMax.depth[1]} />
      </div>
    {/if}
  </div>

  <button class="reset-btn" on:click={resetFilters}>Сбросить фильтры</button>
</div>

<style lang="scss">
  .filters {
    display: flex;
    flex-direction: column;
    gap: 20px;
    .filter-block {
      border: 1px solid #eee;
      border-radius: 10px;
      overflow: hidden;
      background: #fff;
      .filter-title {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 14px;
        font-weight: 600;
        cursor: pointer;
        background: #fafafa;
        span {
          transition: 0.2s;
          transform: rotate(-90deg);
        }
        .rotated {
          transform: rotate(0deg);
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

        /* === БАЗА === */
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

        /* === ЧЕКБОКСЫ (ОБЩИЕ) === */
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

        :global(.check.checked),
        :global(.subcheck.checked) {
          background: $yellow;
          border-color: $yellow;
        }

        :global(.check.partial) {
          background: linear-gradient(135deg, rgba($yellow, 1) 40%, rgba($yellow, 0) 60%);
          border-color: $yellow;
        }

        /* === ITEMS === */
        :global(.sub) {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 28px;
          cursor: pointer;
          &:hover {
            background: #f7f7f7;
          }
          &.selected {
            background: rgba($green, 0.08);
          }
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
