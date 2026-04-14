<script lang="ts">
  import { page } from '$app/stores';
  import { slugify } from '$lib/utils/slugify';
  import BrandsGrid from '$lib/components/BrandsGrid.svelte';

  $: typeGroups = $page.data.typeGroups ?? [];
  let columns: any[][] = [[], [], []];
  function buildColumns() {
    const cols: any[][] = [[], [], []];
    const sizes = [0, 0, 0];
    for (const group of typeGroups) {
      const weight = group.items?.length ?? 1;
      const minIndex = sizes.indexOf(Math.min(...sizes));
      cols[minIndex].push(group);
      sizes[minIndex] += weight;
    }
    columns = cols;
  }
  $: if (typeGroups.length) {
    buildColumns();
  }
</script>

<div class="catalog-hub">
  <h1>Каталог</h1>
  <div class="masonry">
    {#each columns as col}
      <div class="col">
        {#each col as group}
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
    {/each}
  </div>

  <div class="brands-section">
    <h2>Бренды</h2>
    <BrandsGrid />
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
  }
  .masonry {
    display: flex;
    gap: 24px;
    align-items: flex-start;
  }
  .col {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }
  .group {
    background: #fff;
    border: 1px solid #eee;
    border-radius: 14px;
    padding: 16px;
  }
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
    &:hover {
      background: #f0f0f0;
    }
  }
  .brands-section {
    margin-top: 40px;
  }
</style>
