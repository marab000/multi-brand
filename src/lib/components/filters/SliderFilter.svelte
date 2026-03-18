<script lang="ts">
  import RangeSlider from 'svelte-range-slider-pips';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';

  export let label: string;
  export let paramMin: string;
  export let paramMax: string;
  export let min: number = 0;
  export let max: number = 100;
  export let step: number = 1;

  let value: [number, number] = [min, max];
  let inputValue: [number, number] = [min, max];

  onMount(() => {
    const params = new URLSearchParams($page.url.search);
    const vMin = params.get(paramMin);
    const vMax = params.get(paramMax);
    if (vMin && vMax) {
      value = [Number(vMin), Number(vMax)];
      inputValue = [...value];
    }
  });

  function updateURL() {
    const params = new URLSearchParams($page.url.search);

    if (value[0] !== min || value[1] !== max) {
      params.set(paramMin, String(value[0]));
      params.set(paramMax, String(value[1]));
    } else {
      params.delete(paramMin);
      params.delete(paramMax);
    }

    goto(`?${params.toString()}`, { keepFocus: true, noScroll: true });
  }

  function inputChange() {
    value = [...inputValue];
    updateURL();
  }
</script>

<div class="filter">
  <div class="range-inputs">
    <input type="number" bind:value={inputValue[0]} on:change={inputChange} />
    <span>—</span>
    <input type="number" bind:value={inputValue[1]} on:change={inputChange} />
  </div>

  <RangeSlider
    {min}
    {max}
    {step}
    range
    bind:values={value}
    on:change={() => {
      inputValue = [...value];
      updateURL();
    }}
  />
</div>

<style lang="scss">
  .filter {
    display: flex;
    flex-direction: column;
    gap: 8px;
    .range-inputs {
      display: flex;
      gap: 6px;
      input {
        width: 80px;
        padding: 2px 4px;
      }
      span {
        align-self: center;
      }
    }
  }
</style>
