<script lang="ts">
  import { page } from '$app/stores';
  import { slugify } from '$lib/utils/slugify';
  $: typeGroups = $page.data.typeGroups ?? [];
  console.log('typeGroups:', typeGroups);
</script>

<div class="catalog-hub">
  <h1>Каталог</h1>

  <div class="grid">
    {#each typeGroups as group}
      <div class="group">
        <h2>{group.group}</h2>

        <div class="items">
          {#each group.items as item}
            <a
              href={`/catalog/${slugify(group.group)}?type=${encodeURIComponent(item.name)}`}
              class="item"
            >
              {item.name}
            </a>
          {/each}
        </div>
      </div>
    {/each}
  </div>
</div>

<style lang="scss">
  .catalog-hub {
    padding-bottom: 20px;
    h1 {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 20px;
    }
    .grid {
      display: grid;
      gap: 24px;
      @media (min-width: 768px) {
        grid-template-columns: repeat(2, 1fr);
      }
      @media (min-width: 1024px) {
        grid-template-columns: repeat(3, 1fr);
      }
    }
    .group {
      background: #fff;
      border: 1px solid #eee;
      border-radius: 14px;
      padding: 16px;
      h2 {
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 12px;
      }
      .items {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .item {
        padding: 10px 12px;
        border-radius: 8px;
        background: #fafafa;
        text-decoration: none;
        color: #000;
        font-size: 14px;
        transition: 0.2s;
        &:hover {
          background: #f0f0f0;
        }
      }
    }
  }
</style>
