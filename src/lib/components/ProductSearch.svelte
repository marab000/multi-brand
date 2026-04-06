<script lang="ts">
  import { slugify } from '$lib/utils/slugify';
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { Search, X, Folder } from 'lucide-svelte';

  let query = '';
  let results: any[] = [];
  let open = false;
  let selected = -1;
  let timer: any;

  let suggestions: any[] = [];

  async function search() {
    if (query.length < 2) {
      results = [];
      suggestions = [];
      open = false;
      return;
    }

    const res = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) {
      results = [];
      suggestions = [];
      open = false;
      return;
    }

    results = await res.json();

    suggestions = [
      { type: 'category', name: 'Холодильники', url: `/catalog?search=${query}` },
      { type: 'category', name: 'Двухкамерные холодильники', url: `/catalog?type=${query}` }
    ];

    open = true;
    selected = -1;
  }

  function handleInput() {
    clearTimeout(timer);
    timer = setTimeout(search, 250);
  }

  function clearInput() {
    query = '';
    results = [];
    suggestions = [];
    open = false;
  }

  function goToProduct(p: any) {
    const slug = slugify(p.name);
    window.location.href = `/products/${slug}`;
  }

  function goTo(url: string) {
    window.location.href = url;
  }

  function handleKey(e: KeyboardEvent) {
    if (!open) return;

    const total = suggestions.length + results.length;

    if (e.key === 'ArrowDown') selected = Math.min(selected + 1, total - 1);
    if (e.key === 'ArrowUp') selected = Math.max(selected - 1, 0);

    if (e.key === 'Enter') {
      if (selected >= 0) {
        if (selected < suggestions.length) goTo(suggestions[selected].url);
        else goToProduct(results[selected - suggestions.length]);
      } else submitSearch();
    }
  }

  function submitSearch() {
    window.location.href = `/catalog?search=${encodeURIComponent(query)}`;
  }

  function handleClickOutside(e: MouseEvent) {
    const path = e.composedPath();
    if (!path.some((el: any) => el?.classList?.contains('search'))) open = false;
  }

  if (browser) {
    onMount(() => document.addEventListener('click', handleClickOutside));
    onDestroy(() => document.removeEventListener('click', handleClickOutside));
  }
</script>

<div class="search">
  <div class="input-wrap">
    <input
      class="input primary"
      type="text"
      placeholder="Поиск..."
      bind:value={query}
      on:input={handleInput}
      on:keydown={handleKey}
    />
    {#if query}
      <button class="clear" on:click={clearInput}><X size={18} /></button>
    {/if}

    <button class="btn-search" on:click={submitSearch}>
      <Search size={18} />
    </button>
  </div>

  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  {#if open && (results.length || suggestions.length)}
    <div class="dropdown">
      {#each suggestions as s, i}
        <div class="item font-medium" class:selected={i === selected} on:click={() => goTo(s.url)}>
          <Folder size={18} />
          <span>{s.name}</span>
        </div>
      {/each}
      {#each results as r, i}
        <div
          class="item"
          class:selected={i + suggestions.length === selected}
          on:click={() => goToProduct(r)}
        >
          <img
            src={r.images?.[0]?.url ?? '/images/no_image.png'}
            alt={r.images?.[0]?.url ?? '/images/no_image.png'}
          />
          <div class="info">
            <div class="top">
              <div class="name">{r.name}</div>
              <div class="brand">{r.brand_name}</div>
            </div>
            <div class="description">{r.description}</div>
          </div>
        </div>
      {/each}
      <div class="all" on:click={submitSearch}>Показать все результаты</div>
    </div>
  {/if}
</div>

<style lang="scss">
  .search {
    width: 66%;
    position: relative;
    margin: auto;
    .input-wrap {
      position: relative;
      .input {
        width: 100%;
        height: 50px;
        border-color: #{$green-light};
      }
      .btn-search {
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        height: 38px;
        width: 38px;
        border-radius: 10px;
        border: none;
        background: linear-gradient(135deg, $green-soft, $green-light);
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: 0.2s;
        &:hover {
          background: linear-gradient(135deg, $green-light, $green);
        }
      }
      .clear {
        position: absolute;
        right: 50px;
        top: 50%;
        transform: translateY(-50%);
        margin-right: 10px;
        border: none;
        background: transparent;
        cursor: pointer;
        color: #aaa;
        display: flex;
        align-items: center;
        justify-content: center;
        &:hover {
          color: #000;
        }
      }
    }

    .dropdown {
      position: absolute;
      top: calc(100% + 10px);
      left: 0;
      right: 0;
      z-index: 50;
      background: #fff;
      border-radius: 14px;
      border: 1px solid #eee;
      box-shadow: 0 15px 30px rgba(0, 0, 0, 0.06);
      overflow: hidden;
    }
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
    .info {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
      .top {
        display: flex;
        gap: 6px;
        align-items: center;
      }
      .name {
        font-size: 14px;
        font-weight: 500;
      }
      .brand {
        font-size: 12px;
        color: #888;
      }
      .description {
        font-size: 12px;
        color: #666;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
    &:hover {
      background: #f7f9f8;
    }
    &.selected {
      background: rgba($green, 0.06);
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
