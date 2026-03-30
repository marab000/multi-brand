<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';

  export let items: string[] = [];
  export let param: string;

  let selected: string[] = [];

  function toggle(value: string) {
    selected = selected.includes(value)
      ? selected.filter((x) => x !== value)
      : [...selected, value];
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
      if (aSel !== bSel) return aSel ? -1 : 1;
      return a.localeCompare(b);
    });
  }
  $: selected = $page.url.searchParams.getAll(param);
  $: sorted = sortItems(items);
</script>

<div class="filter">
  <div class="filter-body">
    {#each sorted as item}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="group" on:click={() => toggle(item)}>
        <div class="row">
          <div class="check" class:checked={selected.includes(item)}></div>
          <span>{item}</span>
        </div>
      </div>
    {/each}
  </div>
</div>

<style lang="scss">
  .row {
    background: transparent !important;
  }
</style>
