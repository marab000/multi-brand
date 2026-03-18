<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { slide } from 'svelte/transition';
  import { COLOR_GROUPS } from '$lib/filters/colorGroups';
  import { getGroupColor } from '$lib/filters/colorUtils';

  export let colors: string[] = [];

  let selectedColors: string[] = [];
  let openGroups: Record<string, boolean> = {};

  function toggleColor(color: string) {
    selectedColors = selectedColors.includes(color)
      ? selectedColors.filter((c) => c !== color)
      : [...selectedColors, color];
    updateURL();
  }

  function toggleGroup(group: string, items: string[]) {
    const available = items.filter((i) => colors.includes(i));
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
    const params = new URLSearchParams($page.url.search);
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
    return [...list].sort((a, b) =>
      selectedColors.includes(a) === selectedColors.includes(b)
        ? 0
        : selectedColors.includes(a)
          ? -1
          : 1
    );
  }

  function getSortedGroups() {
    return Object.entries(COLOR_GROUPS)
      .map(([group, items]) => {
        const available = items.filter((i) => colors.includes(i));
        const selectedCount = available.filter((c) => selectedColors.includes(c)).length;
        return { group, items, available, selectedCount };
      })
      .filter((g) => g.available.length)
      .sort((a, b) => {
        const aHas = a.selectedCount > 0;
        const bHas = b.selectedCount > 0;
        return aHas !== bHas ? (aHas ? -1 : 1) : b.selectedCount - a.selectedCount;
      });
  }

  $: selectedColors = $page.url.searchParams.getAll('color');
  $: groups = getSortedGroups();
</script>

<div class="filter">
  <div class="filter-body">
    {#each groups as g}
      {@const sorted = sortColors(g.available)}
      <div class="group">
        <div class="row">
          <div
            class="check"
            class:checked={isGroupSelected(g.items)}
            class:partial={isPartial(g.items)}
            on:click={() => toggleGroup(g.group, g.items)}
          ></div>
          <div class="label" on:click={() => toggleOpen(g.group)}>
            <span class="dot" style="background:{getGroupColor(g.group)}"></span>
            {g.group}
          </div>
          <div class="arrow" class:open={openGroups[g.group]} on:click={() => toggleOpen(g.group)}>
            ▸
          </div>
        </div>
        {#if openGroups[g.group]}
          <div class="subs" transition:slide>
            {#each sorted as c}
              <div
                class="sub"
                class:selected={selectedColors.includes(c)}
                on:click={() => toggleColor(c)}
              >
                <div class="subcheck" class:checked={selectedColors.includes(c)}></div>
                <span>{c}</span>
              </div>
            {/each}
          </div>
        {/if}
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
    .group {
      border: 1px solid #e5e5e5;
      border-radius: 6px;
      overflow: hidden;
      .row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 10px;
        background: #fafafa;
        cursor: pointer;
        &:hover {
          background: #f2f2f2;
        }
      }
      .check {
        width: 16px;
        height: 16px;
        border: 2px solid #bbb;
        border-radius: 3px;
        &.checked {
          background: #000;
          border-color: #000;
        }
        &.partial {
          background: #666;
          border-color: #666;
        }
      }
      .label {
        display: flex;
        align-items: center;
        gap: 6px;
        flex: 1;
      }
      .dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        border: 1px solid #aaa;
      }
      .arrow {
        transition: 0.2s;
        &.open {
          transform: rotate(90deg);
        }
      }
      .subs {
        display: flex;
        flex-direction: column;
        background: white;
        .sub {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 28px;
          cursor: pointer;
          &:hover {
            background: #f6f6f6;
          }
          &.selected {
            background: #eef2ff;
          }
        }
        .subcheck {
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
    }
  }
</style>
