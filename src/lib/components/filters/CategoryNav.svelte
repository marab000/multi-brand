<script lang="ts">
  import { page } from '$app/stores';
  import { ChevronDown } from 'lucide-svelte';

  export type CategoryNavItem = {
    name: string;
    slug: string;
    href: string;
    level: 'group' | 'leaf';
  };

  type GroupNode = {
    key: string;
    name: string;
    href: string;
    active: boolean;
    leaves: CategoryNavItem[];
  };

  let { items = [] } = $props<{ items?: CategoryNavItem[] }>();

  function splitHref(href: string) {
    const [pathname, query = ''] = href.split('?');
    return { pathname, query };
  }

  function isSameUrl(a: string, b: string) {
    return a === b;
  }

  function isChildOfGroup(groupHref: string, leafHref: string) {
    const group = splitHref(groupHref);
    const leaf = splitHref(leafHref);
    return leaf.pathname.startsWith(`${group.pathname}/`) || leaf.pathname === group.pathname;
  }

  function normalizeGroupHrefForLeaf(groupHref: string, leafHref: string) {
    const group = splitHref(groupHref);
    const leaf = splitHref(leafHref);
    return `${group.pathname}${leaf.query ? `?${leaf.query}` : group.query ? `?${group.query}` : ''}`;
  }

  function cleanupLeafName(groupName: string, leafName: string) {
    const prefix = `${groupName} — `;
    if (leafName.startsWith(prefix)) return leafName.slice(prefix.length).trim();
    return leafName.trim();
  }

  const pathname = $derived($page.url.pathname);
  const searchParams = $derived($page.url.searchParams.toString());
  const currentUrl = $derived(`${pathname}${searchParams ? `?${searchParams}` : ''}`);

  const groupedItems = $derived.by(() => {
    const groups: GroupNode[] = [];
    const looseLeaves: CategoryNavItem[] = [];
    for (const item of items) {
      if (item.level === 'group') {
        groups.push({
          key: item.href,
          name: item.name,
          href: item.href,
          active: isSameUrl(currentUrl, item.href),
          leaves: []
        });
        continue;
      }
      const parent = groups.findLast((group) => isChildOfGroup(group.href, item.href));
      if (parent) {
        const normalizedGroupHref = normalizeGroupHrefForLeaf(parent.href, item.href);
        parent.href = normalizedGroupHref;
        parent.active = parent.active || isSameUrl(currentUrl, normalizedGroupHref);
        parent.leaves.push(item);
      } else {
        looseLeaves.push(item);
      }
    }
    return { groups, looseLeaves };
  });

  const hasTree = $derived(groupedItems.groups.some((group) => group.leaves.length > 0));

  let openKey = $state<string | null>(null);

  function isActive(href: string) {
    return isSameUrl(currentUrl, href);
  }

  function hasActiveLeaf(group: GroupNode) {
    return group.leaves.some((leaf) => isSameUrl(currentUrl, leaf.href));
  }

  function isGroupOpen(group: GroupNode) {
    if (openKey !== null) return openKey === group.key;
    return hasActiveLeaf(group) || group.active;
  }

  function toggle(group: GroupNode) {
    openKey = isGroupOpen(group) ? null : group.key;
  }
</script>

{#if hasTree}
  <div class="category-tree">
    {#each groupedItems.groups as group}
      <div class="tree-item" class:open={isGroupOpen(group)} class:active={group.active}>
        <div class="tree-parent">
          <a class="tree-parent-link" href={group.href}>{group.name}</a>
          <div class="divider"></div>
          <button
            class="tree-toggle"
            class:open={isGroupOpen(group)}
            type="button"
            on:click|preventDefault|stopPropagation={() => toggle(group)}
          >
            <span class:rotated={isGroupOpen(group)}>
              <ChevronDown size={18} strokeWidth={2.2} />
            </span>
          </button>
        </div>

        {#if isGroupOpen(group) && group.leaves.length}
          <div class="tree-body">
            <div class="tree-children">
              {#each group.leaves as leaf}
                <a class="tree-child" class:active={isActive(leaf.href)} href={leaf.href}>
                  <span class="dot"></span>
                  <span class="label">{cleanupLeafName(group.name, leaf.name)}</span>
                </a>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {/each}

    {#each groupedItems.looseLeaves as leaf}
      <a class="tree-parent tree-parent--link" class:active={isActive(leaf.href)} href={leaf.href}>
        <span>{leaf.name}</span>
      </a>
    {/each}
  </div>
{:else}
  <div class="nav">
    {#each items as item}
      <a class="nav-item" class:active={isActive(item.href)} href={item.href}>
        {item.name}
      </a>
    {/each}
  </div>
{/if}

<style lang="scss">
  .nav {
    display: grid;
    gap: 10px;
  }
  .nav-item,
  .tree-item,
  .tree-parent {
    display: block;
    text-decoration: none;
    color: #222;
    border: 1px solid #eee;
    border-radius: 12px;
    background: #fafafa;
    transition: 0.15s;
  }
  .nav-item {
    padding: 14px 16px;
    line-height: 1.2;
    &:hover {
      background: #f4f4f4;
      text-decoration: underline;
      text-underline-offset: 3px;
    }
    &.active {
      border-color: $yellow;
      background: #fffaf084;
    }
  }
  .category-tree {
    display: grid;
    gap: 12px;
  }
  .tree-item {
    overflow: hidden;
    &.open {
      border-color: $yellow;
    }
    &.active:not(.open) {
      border-color: $yellow;
      background: #fffaf0;
    }
    &:hover:not(.open) {
      border-color: rgba($yellow, 0.3);
    }
  }
  .tree-parent {
    width: 100%;
    display: flex;
    align-items: stretch;
    justify-content: space-between;
    overflow: hidden;
    border: 0;
    background: transparent;
    &--link {
      padding: 14px 16px;
      line-height: 1.2;
      &:hover {
        background: #f4f4f4;
        text-decoration: underline;
        text-underline-offset: 3px;
      }
      &.active {
        border-color: rgba($yellow, 0.5);
        background: #fffaf0;
      }
    }
  }
  .tree-parent-link {
    flex: 1;
    min-width: 0;
    padding: 12px 14px;
    color: inherit;
    text-decoration: none;
    line-height: 1.2;
    &:hover {
      text-decoration: underline;
      text-underline-offset: 3px;
    }
  }
  .divider {
    width: 1px;
    background: #eee;
    margin: 10px 0;
  }
  .tree-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    min-width: 48px;
    background: transparent;
    border: 0;
    cursor: pointer;
    &:hover {
      background: #efeded;
    }
  }
  .tree-toggle :global(span) {
    transition: 0.2s;
  }
  .tree-toggle :global(span.rotated) {
    transform: rotate(-90deg);
  }
  .tree-body {
    background: #fff;
    padding: 18px;
  }
  .tree-children {
    display: grid;
    gap: 12px;
  }
  .tree-child {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    color: #5b5b5b;
    text-decoration: none;
    line-height: 1.35;
    transition: 0.15s;
    .dot {
      width: 7px;
      height: 7px;
      min-width: 7px;
      border-radius: 999px;
      background: rgba($green, 0.75);
      margin-top: 6px;
    }
    .label {
      display: block;
    }
    &:hover {
      color: #222;
      text-decoration: underline;
      text-underline-offset: 2px;
    }
    &.active {
      color: #222;
      font-weight: 500;
      .dot {
        background: $yellow;
      }
    }
  }
</style>
