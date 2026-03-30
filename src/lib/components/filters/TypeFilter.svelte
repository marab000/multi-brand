<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { slide } from 'svelte/transition';

  type FilterGroup = { group: string; items: string[] };

  export let groups: FilterGroup[] = [];

  let selected: { group: string; value: string }[] = [];
  let open: Record<string, boolean> = {};

  function toggleItem(group: string, value: string) {
    const exists = selected.some((s) => s.value === value && s.group === group);
    selected = exists
      ? selected.filter((s) => !(s.value === value && s.group === group))
      : [...selected, { group, value }];
    updateURL();
  }

  function toggleGroup(group: string, groupItems: string[]) {
    const inGroup = selected.filter((s) => s.group === group);
    const isFull = inGroup.length === groupItems.length;
    selected = isFull
      ? selected.filter((s) => s.group !== group)
      : [
          ...selected.filter((s) => s.group !== group),
          ...groupItems.map((i) => ({ group, value: i }))
        ];
    updateURL();
  }

  function toggleOpen(name: string) {
    open = { ...open, [name]: !open[name] };
  }

  function updateURL() {
    const params = new URLSearchParams($page.url.search);
    params.delete('type');
    params.delete('category');
    const grouped: Record<string, string[]> = {};
    selected.forEach((s) => {
      if (!grouped[s.group]) grouped[s.group] = [];
      grouped[s.group].push(s.value);
    });
    for (const g of groups) {
      const sel = grouped[g.group] || [];
      if (sel.length === g.items.length) {
        params.append('category', g.group);
      } else {
        sel.forEach((v) => params.append('type', v));
      }
    }
    goto(`?${params.toString()}`, { keepFocus: true, noScroll: true });
  }

  function isGroupSelected(group: string, items: string[]) {
    const inGroup = selected.filter((s) => s.group === group);
    return items.length && inGroup.length === items.length;
  }

  function isPartial(group: string, items: string[]) {
    const inGroup = selected.filter((s) => s.group === group);
    return inGroup.length > 0 && inGroup.length < items.length;
  }

  function sortItems(group: string, items: string[], sel: typeof selected) {
    return [...items].sort((a, b) => {
      const aSel = sel.some((s) => s.value === a && s.group === group);
      const bSel = sel.some((s) => s.value === b && s.group === group);
      if (aSel !== bSel) return aSel ? -1 : 1;
      return a.localeCompare(b);
    });
  }

  function sortGroups(groups: FilterGroup[], sel: typeof selected) {
    return [...groups]
      .map((g) => ({
        ...g,
        items: sortItems(g.group, g.items, sel)
      }))
      .sort((a, b) => {
        const aAll = isGroupSelected(a.group, a.items);
        const bAll = isGroupSelected(b.group, b.items);
        if (aAll !== bAll) return aAll ? -1 : 1;
        const aPartial = isPartial(a.group, a.items);
        const bPartial = isPartial(b.group, b.items);
        if (aPartial !== bPartial) return aPartial ? -1 : 1;
        return a.group.localeCompare(b.group);
      });
  }

  $: {
    const types = $page.url.searchParams.getAll('type');
    const categories = $page.url.searchParams.getAll('category');
    const next: typeof selected = [];
    categories.forEach((cat) => {
      const g = groups.find((gr) => gr.group === cat);
      if (g) next.push(...g.items.map((i) => ({ group: g.group, value: i })));
    });
    types.forEach((t) => {
      const g = groups.find((gr) => gr.items.includes(t));
      if (g) next.push({ group: g.group, value: t });
    });
    if (!isSame(selected, next)) {
      selected = next;
    }
  }

  function isSame(a: typeof selected, b: typeof selected) {
    if (a.length !== b.length) return false;
    return a.every((x) => b.some((y) => y.group === x.group && y.value === x.value));
  }
  $: sortedGroups = sortGroups(groups, selected);
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="filter">
  <div class="filter-body">
    {#each sortedGroups as g}
      <div class="group">
        <div class="row">
          <div
            class="check"
            class:checked={isGroupSelected(g.group, g.items)}
            class:partial={isPartial(g.group, g.items)}
            on:click|stopPropagation={() => toggleGroup(g.group, g.items)}
          ></div>

          <div class="label" on:click={() => toggleOpen(g.group)}>
            <span class="text">{g.group}</span>
            <span class="arrow" class:open={open[g.group]}>⌄</span>
          </div>
        </div>

        {#if open[g.group]}
          <div class="subs" transition:slide>
            {#each g.items as item}
              <div
                class="sub"
                class:selected={selected.some((s) => s.value === item && s.group === g.group)}
                on:click={() => toggleItem(g.group, item)}
              >
                <div
                  class="subcheck"
                  class:checked={selected.some((s) => s.value === item && s.group === g.group)}
                ></div>
                <span>{item}</span>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>

<style lang="scss">
</style>
