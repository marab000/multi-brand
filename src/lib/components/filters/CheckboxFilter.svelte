<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';

  export let items: string[] = [];
  export let param: string;

  let selected: string[] = [];

  function toggle(value: string) {
    if (selected.includes(value)) {
      selected = selected.filter((x) => x !== value);
    } else {
      selected = [...selected, value];
    }
    updateURL();
  }

  function updateURL() {
    const params = new URLSearchParams($page.url.search);
    params.delete(param);
    selected.forEach((v) => params.append(param, v));
    goto(`?${params.toString()}`, { keepFocus: true, noScroll: true });
  }

  function sortItems(list: string[]) {
    return [...list].sort((a, b) => {
      const aSel = selected.includes(a);
      const bSel = selected.includes(b);
      if (aSel === bSel) return 0;
      return aSel ? -1 : 1;
    });
  }

  $: sorted = sortItems(items);

  onMount(() => {
    const params = new URLSearchParams($page.url.search);
    selected = params.getAll(param);
  });
</script>

<div class="filter">
  <div class="filter-body">
    {#each sorted as item}
      <div class="row" on:click={() => toggle(item)}>
        <div class="check" class:checked={selected.includes(item)}></div>
        <span>{item}</span>
      </div>
    {/each}
  </div>
</div>

<style lang="scss">
  .filter {
    display: flex;
    flex-direction: column;
    gap: 6px;
    .filter-body {
      max-height: 320px;
      overflow: auto;
      padding-right: 4px;
    }
    .row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 8px;
      cursor: pointer;
      &:hover {
        background: #f6f6f6;
      }
    }
    .check {
      width: 14px;
      height: 14px;
      border: 2px solid #bbb;
      border-radius: 3px;
      &.checked {
        background: #000;
        border-color: #000;
      }
    }
    span {
      font-size: 13px;
    }
  }
</style>
