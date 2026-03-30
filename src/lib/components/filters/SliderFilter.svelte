<script lang="ts">
  import RangeSlider from 'svelte-range-slider-pips';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';

  export let paramMin: string;
  export let paramMax: string;
  export let min = 0;
  export let max = 100;

  let sliderValue: [number, number] = [min, max];
  let committedValue: [number, number] = [min, max];
  let inputValue: [string, string] = [String(min), String(max)];

  let isDragging = false;
  let initialized = false;

  function parseSafe(val: string) {
    if (!val) return null;
    const cleaned = val.replace(',', '.').match(/^\d+(\.\d+)?/);
    if (!cleaned) return null;
    const num = Number(cleaned[0]);
    return isNaN(num) ? null : num;
  }

  function roundBounds(minVal: number, maxVal: number) {
    return [Math.floor(minVal), Math.ceil(maxVal)] as [number, number];
  }

  onMount(() => {
    const params = new URLSearchParams($page.url.search);
    const vMin = parseSafe(params.get(paramMin) || '');
    const vMax = parseSafe(params.get(paramMax) || '');
    let [initMin, initMax] = vMin != null && vMax != null ? roundBounds(vMin, vMax) : [min, max];
    committedValue = [initMin, initMax];
    sliderValue = [...committedValue];
    inputValue = [String(initMin), String(initMax)];
    initialized = true;
    window.addEventListener('mouseup', handleRelease);
    window.addEventListener('touchend', handleRelease);
  });

  $: if (initialized && isDragging) inputValue = [String(sliderValue[0]), String(sliderValue[1])];
  $: if (initialized && !isDragging) {
    sliderValue = [...committedValue];
    inputValue = [String(committedValue[0]), String(committedValue[1])];
  }

  function handleStart() {
    isDragging = true;
  }

  function handleRelease() {
    if (isDragging) {
      isDragging = false;
      commit();
    }
  }

  function commit() {
    let minVal = parseSafe(inputValue[0]);
    let maxVal = parseSafe(inputValue[1]);
    if (minVal == null || maxVal == null) return;
    [minVal, maxVal] = roundBounds(minVal, maxVal);
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
    sliderValue = [...committedValue];
    inputValue = [String(minVal), String(maxVal)];
    goto(`?${params.toString()}`, { keepFocus: true, noScroll: true });
  }

  function inputChange() {
    let minVal = parseSafe(inputValue[0]);
    let maxVal = parseSafe(inputValue[1]);
    if (minVal == null || maxVal == null) return;
    [minVal, maxVal] = roundBounds(minVal, maxVal);
    sliderValue = [minVal, maxVal];
    inputValue = [String(minVal), String(maxVal)];
    commit();
  }
</script>

<div class="filter">
  <div class="range-inputs">
    <input type="text" bind:value={inputValue[0]} on:change={inputChange} />
    <span>—</span>
    <input type="text" bind:value={inputValue[1]} on:change={inputChange} />
  </div>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div on:mousedown={handleStart} on:touchstart={handleStart}>
    <RangeSlider {min} {max} step={1} range bind:values={sliderValue} />
  </div>
</div>

<style lang="scss">
  .filter {
    .range-inputs {
      display: grid;
      grid-template-columns: 1fr 10px 1fr;
      gap: 8px;
      input {
        min-width: 0;
        height: 36px;
        padding: 0 10px;
        border-radius: 8px;
        border: 1px solid #ddd;
        font-size: 14px;
      }
      span {
        display: flex;
        align-items: center;
        color: #888;
      }
    }
    :global(.rangeSlider) {
      height: 4px;
      background: #e5e5e5;
      border-radius: 999px;
      position: relative;
    }
    :global(.rangeSlider .rangeBar) {
      background: $yellow !important;
      height: 4px;
      border-radius: 999px;
    }
    :global(.rangeHandle) {
      width: 20px;
      height: 20px;
      top: 4px;
      &::before {
        content: none;
      }
      :global(.rangeNub) {
        width: 16px;
        height: 16px;
        background-color: #fff !important;
        border: 3px solid $yellow;
        border-radius: 50%;
        &:active {
          background: $yellow !important;
        }
        &:hover,
        &:active {
          box-shadow: 0 0 1px 2px $yellow;
        }
      }
    }
    :global(.rangeSlider *) {
      background-image: none !important;
    }
  }
</style>
