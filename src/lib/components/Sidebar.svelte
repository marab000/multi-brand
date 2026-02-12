<script>
  import { onMount } from 'svelte'
  import { fetchCatalogTree } from '$lib/api'

  let tree = {}

  onMount(async () => {
    tree = await fetchCatalogTree()
  })
</script>

<div class="sidebar">
  {#each Object.entries(tree) as [brand, categories]}
    <div class="brand">
      <a href={`/catalog/${brand}`}>{brand}</a>

      {#each Object.entries(categories) as [category, types]}
        <div class="category">
          <a href={`/catalog/${brand}/${category}`}>
            {category}
          </a>

          {#each types as type}
            <div class="type">
              <a href={`/catalog/${brand}/${category}/${type}`}>
                {type}
              </a>
            </div>
          {/each}
        </div>
      {/each}
    </div>
  {/each}
</div>

<style>
  .sidebar {
    width: 260px;
  }

  .brand {
    margin-bottom: 20px;
    font-weight: bold;
  }

  .category {
    margin-left: 10px;
    font-weight: normal;
  }

  .type {
    margin-left: 20px;
    font-size: 14px;
  }

  a {
    text-decoration: none;
    display: block;
    padding: 4px 0;
  }
</style>
