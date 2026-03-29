<script lang="ts">
  import RangeSlider from 'svelte-range-slider-pips';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';

  export let paramMin: string;
  export let paramMax: string;
  export let min = 0;
  export let max = 100;
  export let step = 1;

  let sliderValue: [number, number] = [min, max];
  let committedValue: [number, number] = [min, max];
  let inputValue: [string, string] = [String(min), String(max)];

  let isDragging = false;
  let initialized = false;

  function parseSafe(val: string) {
    if (!val) return null;

    // ❗ убираем всё лишнее (включая "42.5.")
    const cleaned = val.replace(',', '.').match(/^\d+(\.\d+)?/);
    if (!cleaned) return null;

    const num = Number(cleaned[0]);
    return isNaN(num) ? null : num;
  }

  onMount(() => {
    const params = new URLSearchParams($page.url.search);
    const vMin = parseSafe(params.get(paramMin) || '');
    const vMax = parseSafe(params.get(paramMax) || '');

    if (vMin != null && vMax != null) {
      committedValue = [vMin, vMax];
    } else {
      committedValue = [min, max];
    }

    sliderValue = [...committedValue];
    inputValue = [String(committedValue[0]), String(committedValue[1])];

    initialized = true;

    window.addEventListener('mouseup', handleRelease);
    window.addEventListener('touchend', handleRelease);
  });

  // ✅ при drag обновляем input
  $: if (initialized && isDragging) {
    inputValue = [String(sliderValue[0]), String(sliderValue[1])];
  }

  // ✅ после commit
  $: if (initialized && !isDragging) {
    sliderValue = [...committedValue];
    inputValue = [String(committedValue[0]), String(committedValue[1])];
  }

  function handleStart() {
    isDragging = true;
  }

  function handleRelease() {
    if (!isDragging) return;
    isDragging = false;
    commit();
  }

  function commit() {
    const minVal = parseSafe(inputValue[0]);
    const maxVal = parseSafe(inputValue[1]);

    if (minVal == null || maxVal == null) return;

    if (committedValue[0] === minVal && committedValue[1] === maxVal) return;

    committedValue = [minVal, maxVal];

    const params = new URLSearchParams($page.url.search);

    if (minVal !== min || maxVal !== max) {
      params.set(paramMin, String(minVal));
      params.set(paramMax, String(maxVal));
    } else {
      params.delete(paramMin);
      params.delete(paramMax);
    }

    goto(`?${params.toString()}`, { keepFocus: true, noScroll: true });
  }

  function inputChange() {
    const minVal = parseSafe(inputValue[0]);
    const maxVal = parseSafe(inputValue[1]);

    if (minVal == null || maxVal == null) return;

    sliderValue = [minVal, maxVal];
    commit();
  }
</script>

<div class="filter">
  <div class="range-inputs">
    <input type="text" bind:value={inputValue[0]} on:change={inputChange} />
    <span>—</span>
    <input type="text" bind:value={inputValue[1]} on:change={inputChange} />
  </div>

  <div on:mousedown={handleStart} on:touchstart={handleStart}>
    <RangeSlider {min} {max} {step} range bind:values={sliderValue} />
  </div>
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
