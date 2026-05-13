<script lang="ts">
  import { page } from '$app/stores';
  import { ChevronDown } from 'lucide-svelte';
  export type CategoryNavItem = {
    name: string;
    slug: string;
    href: string;
    level: 'root' | 'group' | 'leaf';
    parentSlug?: string;
    rootSlug?: string;
    groupSlug?: string;
  };
  type LeafNode = CategoryNavItem;
  type GroupNode = CategoryNavItem & { leaves: LeafNode[] };
  type RootNode = CategoryNavItem & { groups: GroupNode[] };
  let { items = [] } = $props<{ items?: CategoryNavItem[] }>();
  const pathname = $derived($page.url.pathname);
  const searchParams = $derived($page.url.searchParams.toString());
  const currentUrl = $derived(`${pathname}${searchParams ? `?${searchParams}` : ''}`);
  let openRoot = $state<string | null>(null);
  let openGroup = $state<string | null>(null);
  function samePath(href: string) {
    return href.split('?')[0] === pathname;
  }
  function hrefWithCurrentQuery(href: string) {
    const [path, query = ''] = href.split('?');
    const params = new URLSearchParams(query);
    const current = new URLSearchParams($page.url.searchParams);
    current.delete('page');
    current.forEach((value, key) => {
      if (!params.has(key)) params.append(key, value);
    });
    const qs = params.toString();
    return qs ? `${path}?${qs}` : path;
  }
  function isActive(href: string) {
    return currentUrl === hrefWithCurrentQuery(href);
  }
  function toggleRoot(slug: string) {
    openRoot = isRootOpen(slug) ? null : slug;
  }
  function toggleGroup(key: string) {
    openGroup = isGroupOpen(key) ? null : key;
  }
  const tree = $derived.by(() => {
    const roots: RootNode[] = [];
    const rootMap = new Map<string, RootNode>();
    const looseGroups: GroupNode[] = [];
    const looseLeaves: LeafNode[] = [];
    for (const item of items) {
      if (item.level === 'root') {
        const root: RootNode = { ...item, groups: [] };
        roots.push(root);
        rootMap.set(item.slug, root);
      }
    }
    for (const item of items) {
      if (item.level === 'group') {
        const group: GroupNode = { ...item, leaves: [] };
        const root = item.rootSlug ? rootMap.get(item.rootSlug) : null;
        if (root) root.groups.push(group);
        else looseGroups.push(group);
      }
    }
    for (const item of items) {
      if (item.level === 'leaf') {
        const root = item.rootSlug ? rootMap.get(item.rootSlug) : null;
        const group =
          root?.groups.find((g) => g.slug === item.groupSlug) ??
          looseGroups.find((g) => g.slug === item.groupSlug);
        if (group) group.leaves.push(item);
        else looseLeaves.push(item);
      }
    }
    return { roots, looseGroups, looseLeaves };
  });
  const hasRootTree = $derived(tree.roots.length > 0);
  function rootHasActive(root: RootNode) {
    return (
      samePath(root.href) ||
      root.groups.some(
        (group) => samePath(group.href) || group.leaves.some((leaf) => samePath(leaf.href))
      )
    );
  }
  function groupHasActive(group: GroupNode) {
    return samePath(group.href) || group.leaves.some((leaf) => samePath(leaf.href));
  }
  function isRootOpen(slug: string) {
    const root = tree.roots.find((item) => item.slug === slug);
    if (!root) return false;
    if (openRoot !== null) return openRoot === slug;
    return rootHasActive(root);
  }
  function isGroupOpen(key: string) {
    const group =
      tree.roots
        .flatMap((root) => root.groups)
        .find((item) => `${item.rootSlug || ''}::${item.slug}` === key) ??
      tree.looseGroups.find((item) => `${item.rootSlug || ''}::${item.slug}` === key);
    if (!group) return false;
    if (openGroup !== null) return openGroup === key;
    return groupHasActive(group);
  }
  function showLeavesForGroup(group: GroupNode) {
    return samePath(group.href) || group.leaves.some((leaf) => samePath(leaf.href));
  }
</script>

{#if hasRootTree}
  <div class="category-tree">
    {#each tree.roots as root}
      <div class="root-item" class:open={isRootOpen(root.slug)} class:active={samePath(root.href)}>
        <div class="root-head">
          <a class="root-link" href={hrefWithCurrentQuery(root.href)}>{root.name}</a>
          {#if root.groups.length}
            <button
              class="toggle"
              type="button"
              onclick={() => toggleRoot(root.slug)}
              aria-label={isRootOpen(root.slug) ? 'Свернуть категорию' : 'Раскрыть категорию'}
            >
              <span class:open={isRootOpen(root.slug)}
                ><ChevronDown size={16} strokeWidth={2.2} /></span
              >
            </button>
          {/if}
        </div>
        {#if isRootOpen(root.slug) && root.groups.length}
          <div class="group-list">
            {#each root.groups as group}
              {@const groupKey = `${group.rootSlug || ''}::${group.slug}`}
              <div class="group-item" class:active={samePath(group.href)}>
                <div class="group-head">
                  <a class="group-link" href={hrefWithCurrentQuery(group.href)}>{group.name}</a>
                  {#if group.leaves.length && showLeavesForGroup(group)}
                    <button
                      class="toggle small"
                      type="button"
                      onclick={() => toggleGroup(groupKey)}
                      aria-label={isGroupOpen(groupKey) ? 'Свернуть группу' : 'Раскрыть группу'}
                    >
                      <span class:open={isGroupOpen(groupKey)}
                        ><ChevronDown size={16} strokeWidth={2.2} /></span
                      >
                    </button>
                  {/if}
                </div>
                {#if isGroupOpen(groupKey) && group.leaves.length && showLeavesForGroup(group)}
                  <div class="leaf-list">
                    {#each group.leaves as leaf}
                      <a
                        class="leaf-link"
                        class:active={samePath(leaf.href)}
                        href={hrefWithCurrentQuery(leaf.href)}>{leaf.name}</a
                      >
                    {/each}
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  </div>
{:else}
  <div class="nav">
    {#each items as item}
      <a
        class="nav-item"
        class:active={isActive(item.href) || samePath(item.href)}
        href={hrefWithCurrentQuery(item.href)}>{item.name}</a
      >
    {/each}
  </div>
{/if}

<style lang="scss">
  .category-tree,
  .nav {
    display: grid;
    gap: 8px;
    padding-top: 4px;
  }
  .root-item,
  .group-item,
  .nav-item {
    border: 1px solid #eee;
    border-radius: 10px;
    background: #fafafa;
    overflow: hidden;
  }
  .root-item.open {
    background: #fff;
  }
  .root-item.active,
  .group-item.active,
  .nav-item.active {
    border-color: rgba($yellow, 0.35);
    background: rgba($yellow, 0.035);
  }
  .root-head,
  .group-head {
    display: flex;
    align-items: center;
    background: #fafafa;
  }
  .root-link,
  .group-link,
  .leaf-link,
  .nav-item {
    color: #222;
    text-decoration: none;
    transition: 0.15s;
  }
  .root-link,
  .group-link,
  .nav-item {
    flex: 1;
    padding: 10px;
    font-size: 14px;
    font-weight: 400;
    line-height: 1.2;
  }
  .root-item.active > .root-head .root-link,
  .group-item.active > .group-head .group-link,
  .nav-item.active {
    font-weight: 500;
    color: #111;
  }
  .root-link:hover,
  .group-link:hover,
  .nav-item:hover {
    background: #f3f3f3;
  }
  .toggle {
    width: 36px;
    min-width: 36px;
    align-self: stretch;
    border: 0;
    border-left: 1px solid #eee;
    background: transparent;
    color: #222;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: 0.15s;
    &:hover {
      background: #f3f3f3;
    }
    &.small {
      width: 36px;
      min-width: 36px;
    }
    span {
      display: flex;
      align-items: center;
      justify-content: center;
      transition: 0.2s;
      &.open {
        transform: rotate(180deg);
      }
    }
  }
  .group-list {
    display: grid;
    gap: 8px;
    padding: 8px;
    background: #fff;
  }
  .group-item {
    background: #fafafa;
  }
  .leaf-list {
    display: grid;
    gap: 8px;
    padding: 0 8px 8px;
    background: #fff;
  }
  .leaf-link {
    display: block;
    padding: 10px;
    border: 1px solid #eee;
    border-radius: 10px;
    background: #fafafa;
    font-size: 14px;
    font-weight: 400;
    line-height: 1.2;
    &:hover {
      color: #111;
      background: #f3f3f3;
    }
    &.active {
      color: #111;
      font-weight: 500;
      border-color: rgba($green, 0.35);
      background: rgba($green, 0.035);
    }
  }
</style>
