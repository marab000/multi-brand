<script lang="ts">
  import { page } from '$app/stores';

  type CategoryNavItem = {
    name: string;
    slug: string;
    href: string;
    level: 'group' | 'leaf';
  };

  let { items = [] } = $props<{
    items?: CategoryNavItem[];
    activeVariant?: 'underline' | 'dot' | 'fade';
  }>();

  const pathname = $derived($page.url.pathname);

  function isActive(item: CategoryNavItem) {
    return pathname === item.href;
  }
</script>

<div class="category-nav">
  <div class="filter-body">
    {#each items as item}
      <a
        href={item.href}
        class="nav-item"
        class:leaf={item.level === 'leaf'}
        class:active={isActive(item)}
      >
        <span class="text">{item.name}</span>
      </a>
    {/each}
  </div>
</div>

<style lang="scss">
  .category-nav {
    .filter-body {
      max-height: 400px;
      overflow: auto;
      display: grid;
      gap: 8px;
      padding-right: 8px;
    }
    .nav-item {
      position: relative;
      display: flex;
      align-items: center;
      min-height: 42px;
      padding: 10px 12px;
      border: 1px solid #eee;
      border-radius: 10px;
      background: #fafafa;
      color: #222;
      text-decoration: none;
      transition: 0.18s ease;
      &.leaf {
        padding-left: 18px;
      }
      &:hover {
        background: #f3f3f3;
      }
      .text {
        line-height: 1.2;
      }
      &.active {
        border-color: rgba($yellow, 1);
        font-weight: 500;
      }
    }
  }
</style>
