<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { slide } from 'svelte/transition';
  import { ChevronDown } from 'lucide-svelte';
  import { COLOR_GROUPS } from '$lib/filters/colorGroups';
  import { getGroupColor } from '$lib/filters/colorUtils';

  export let colors: string[] = [];

  let selectedColors: string[] = $page.url.searchParams.getAll('color');
  let openGroups: Record<string, boolean> = {};

  function toggleColor(color: string) {
    selectedColors = selectedColors.includes(color)
      ? selectedColors.filter((c) => c !== color)
      : [...selectedColors, color];
    updateURL();
  }

  function toggleGroup(group: string, items: string[]) {
    const available = items.filter((c) => colors.includes(c));
    const allSelected = available.every((c) => selectedColors.includes(c));
    selectedColors = allSelected
      ? selectedColors.filter((c) => !available.includes(c))
      : [...new Set([...selectedColors, ...available])];
    updateURL();
  }

  function toggleOpen(group: string) {
    openGroups = { ...openGroups, [group]: !openGroups[group] };
  }

  function updateURL() {
    const params = new URLSearchParams($page.url.searchParams);
    params.delete('color');
    selectedColors.forEach((c) => params.append('color', c));
    goto(`?${params.toString()}`, { keepFocus: true, noScroll: true });
  }

  function isGroupSelected(items: string[]) {
    const available = items.filter((i) => colors.includes(i));
    return available.length && available.every((c) => selectedColors.includes(c));
  }

  function isPartial(items: string[]) {
    const available = items.filter((i) => colors.includes(i));
    const selectedCount = available.filter((c) => selectedColors.includes(c)).length;
    return selectedCount > 0 && selectedCount < available.length;
  }

  function sortColors(list: string[]) {
    return [...list].sort((a, b) => {
      const aSel = selectedColors.includes(a);
      const bSel = selectedColors.includes(b);
      if (aSel !== bSel) return aSel ? -1 : 1;
      return a.localeCompare(b);
    });
  }

  $: sortedGroupsWithColors = Object.entries(COLOR_GROUPS)
    .map(([group, items]) => {
      const available = items.filter((i) => colors.includes(i));
      return { group, items, available, sorted: sortColors(available) };
    })
    .filter((g) => g.available.length)
    .sort((a, b) => {
      const aSelected = a.sorted.some((c) => selectedColors.includes(c));
      const bSelected = b.sorted.some((c) => selectedColors.includes(c));
      if (aSelected !== bSelected) return aSelected ? -1 : 1;
      return a.group.localeCompare(b.group);
    });
</script>

<div class="filter">
  <div class="filter-body">
    {#each sortedGroupsWithColors as g}
      <div class="group">
        <div class="row">
          <button
            title=""
            class="check"
            class:checked={isGroupSelected(g.items)}
            class:partial={isPartial(g.items)}
            on:click|stopPropagation={() => toggleGroup(g.group, g.items)}
          ></button>
          <button class="label" on:click={() => toggleOpen(g.group)}>
            <span class="label-main">
              <span class="dot" style="background:{getGroupColor(g.group)}"></span>
              <span class="text">{g.group}</span>
            </span>

            <span class="arrow-icon" class:open={openGroups[g.group]}>
              <ChevronDown size={16} strokeWidth={2.2} />
            </span>
          </button>
        </div>

        {#if openGroups[g.group]}
          <div class="subs" transition:slide>
            {#each g.sorted as c}
              <button
                class="sub"
                class:selected={selectedColors.includes(c)}
                on:click={() => toggleColor(c)}
              >
                <div class="subcheck" class:checked={selectedColors.includes(c)}></div>
                <span>{c}</span>
              </button>
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>

<style lang="scss">
  .label {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;

    margin: -10px;
    padding: 10px;

    border-radius: 10px;
  }

  .label-main {
    display: flex;
    align-items: center;
    min-width: 0;
    flex: 1;
  }

  .text {
    min-width: 0;
  }

  .dot {
    margin-right: 10px;
    width: 12px;
    height: 12px;
    min-width: 12px;
    border-radius: 50%;
    border: 1px solid #ccc;
  }

  .arrow-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    transition: 0.2s;

    &.open {
      transform: rotate(180deg);
    }
  }
</style>
