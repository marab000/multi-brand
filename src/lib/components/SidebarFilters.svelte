<script lang="ts">
  import RangeSlider from 'svelte-range-slider-pips';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  export let brands: string[] = [];
  export let types: string[] = [];
  export let minPrice = 0;
  export let maxPrice = 100000;

  let selectedBrands: string[] = [];
  let selectedTypes: string[] = [];

  let values: [number, number] = [minPrice, maxPrice];

  let inputMin = minPrice;
  let inputMax = maxPrice;

  let initialized = false;
  let priceChanged = false;

  onMount(() => {
    const params = new URLSearchParams($page.url.search);

    selectedBrands = params.getAll('brand');
    selectedTypes = params.getAll('type');

    const from = params.get('price_min');
    const to = params.get('price_max');

    if (from !== null && to !== null) {
      values = [Number(from), Number(to)];
      inputMin = values[0];
      inputMax = values[1];
      priceChanged = true;
    } else {
      values = [minPrice, maxPrice];
      inputMin = minPrice;
      inputMax = maxPrice;
    }

    initialized = true;
  });

  function updateURL() {
    const params = new URLSearchParams();

    selectedBrands.forEach((b) => params.append('brand', b));
    selectedTypes.forEach((t) => params.append('type', t));

    if (priceChanged) {
      params.set('price_min', String(values[0]));
      params.set('price_max', String(values[1]));
    }

    goto(`?${params.toString()}`, { keepFocus: true, noScroll: true });
  }

  function toggleBrand(brand: string) {
    if (selectedBrands.includes(brand)) selectedBrands = selectedBrands.filter((b) => b !== brand);
    else selectedBrands = [...selectedBrands, brand];

    updateURL();
  }

  function toggleType(type: string) {
    if (selectedTypes.includes(type)) selectedTypes = selectedTypes.filter((t) => t !== type);
    else selectedTypes = [...selectedTypes, type];

    updateURL();
  }

  function sliderChange() {
    if (!initialized) return;

    values = [Math.round(values[0]), Math.round(values[1])];

    inputMin = values[0];
    inputMax = values[1];

    priceChanged = true;

    updateURL();
  }

  function inputChange() {
    let min = Number(inputMin);
    let max = Number(inputMax);

    if (!Number.isFinite(min)) min = minPrice;
    if (!Number.isFinite(max)) max = maxPrice;

    if (min < minPrice) min = minPrice;
    if (max > maxPrice) max = maxPrice;
    if (min > max) min = max;

    values = [min, max];

    priceChanged = true;

    updateURL();
  }

  function resetFilters() {
    selectedBrands = [];
    selectedTypes = [];
    priceChanged = false;

    values = [minPrice, maxPrice];
    inputMin = minPrice;
    inputMax = maxPrice;

    goto($page.url.pathname, { replaceState: true });
  }
</script>

<div class="filters">
  <div class="filter-block">
    <div class="filter-title">Категории</div>

    {#each types as type}
      <label class="subcategory">
        <input
          type="checkbox"
          checked={selectedTypes.includes(type)}
          on:change={() => toggleType(type)}
        />
        <span>{type}</span>
      </label>
    {/each}
  </div>

  <div class="filter-block">
    <div class="filter-title">Бренды</div>

    {#each brands as brand}
      <label class="brand">
        <input
          type="checkbox"
          checked={selectedBrands.includes(brand)}
          on:change={() => toggleBrand(brand)}
        />
        <span>{brand}</span>
      </label>
    {/each}
  </div>

  <div class="filter-block">
    <div class="filter-title">Цена</div>

    <RangeSlider
      min={minPrice}
      max={maxPrice}
      step={1000}
      range
      bind:values
      on:change={sliderChange}
    />

    <div class="price-inputs">
      <input type="number" bind:value={inputMin} on:change={inputChange} />

      <span>—</span>

      <input type="number" bind:value={inputMax} on:change={inputChange} />
    </div>
  </div>

  <button class="reset" on:click={resetFilters}> Сбросить фильтры </button>
</div>

<style lang="scss">
  .filters {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }
  .filter-block {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .filter-title {
    font-weight: 600;
    font-size: 14px;
  }
  .brand,
  .subcategory {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    cursor: pointer;
  }
  .price-inputs {
    display: flex;
    gap: 10px;
    margin-top: 10px;
  }
  .price-inputs input {
    width: 100%;
    padding: 6px;
    border: 1px solid #ccc;
    border-radius: 4px;
  }
  .reset {
    padding: 10px;
    border: 1px solid #000;
    background: white;
    cursor: pointer;
  }
</style>
