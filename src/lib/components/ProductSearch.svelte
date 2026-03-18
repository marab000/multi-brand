<script lang="ts">
  import { slugify } from '$lib/utils/slugify';

  let query = '';
  let results: any[] = [];
  let open = false;
  let selected = -1;
  let timer: any;

  async function search() {
    if (query.length < 2) {
      results = [];
      open = false;
      return;
    }
    const res = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) {
      results = [];
      open = false;
      return;
    }
    results = await res.json();
    open = true;
    selected = -1;
  }

  function handleInput() {
    clearTimeout(timer);
    timer = setTimeout(search, 250);
  }

  function goToProduct(p: any) {
    const slug = slugify(p.name);
    window.location.href = `/products/${slug}`;
  }

  function handleKey(e: KeyboardEvent) {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      selected = Math.min(selected + 1, results.length - 1);
    }
    if (e.key === 'ArrowUp') {
      selected = Math.max(selected - 1, 0);
    }
    if (e.key === 'Enter') {
      if (selected >= 0) {
        goToProduct(results[selected]);
      } else {
        window.location.href = `/catalog?search=${encodeURIComponent(query)}`;
      }
    }
  }
</script>

<div class="search">
  <input
    type="text"
    placeholder="Поиск товаров..."
    bind:value={query}
    on:input={handleInput}
    on:keydown={handleKey}
  />

  {#if open && results.length}
    <div class="dropdown">
      {#each results as r, i}
        <div class="item" class:selected={i === selected} on:click={() => goToProduct(r)}>
          <img src={r.images?.[0]?.url ?? '/images/no_image.png'} />
          <div class="info">
            <div class="name">{r.name}</div>
            <div class="brand">{r.brand_name}</div>
          </div>
        </div>
      {/each}

      <div
        class="all"
        on:click={() => (window.location.href = `/catalog?search=${encodeURIComponent(query)}`)}
      >
        Показать все результаты
      </div>
    </div>
  {/if}
</div>

<style lang="scss">
  .search {
    position: relative;
    width: 100%;
    max-width: 500px;
    input {
      width: 100%;
      padding: 14px 16px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 16px;
      outline: none;
      transition: 0.2s;
      &:focus {
        border-color: #111;
      }
    }
  }
  .dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: #fff;
    border: 1px solid #eee;
    border-top: none;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
    z-index: 100;
  }
  .item {
    display: flex;
    gap: 12px;
    padding: 10px 14px;
    cursor: pointer;
    align-items: center;
    transition: 0.15s;
    img {
      width: 50px;
      height: 50px;
      object-fit: contain;
    }
    .name {
      font-size: 14px;
    }
    .brand {
      font-size: 12px;
      color: #888;
    }
    &:hover {
      background: #f7f7f7;
    }
    &.selected {
      background: #f0f0f0;
    }
  }
  .all {
    padding: 12px 14px;
    font-size: 14px;
    border-top: 1px solid #eee;
    cursor: pointer;
    background: #fafafa;
    &:hover {
      background: #f2f2f2;
    }
  }
</style>
