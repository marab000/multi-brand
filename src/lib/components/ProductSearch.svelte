<script lang="ts">
  import { slugify } from '$lib/utils/slugify';
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { Search, X, Folder } from 'lucide-svelte';
  import { imgUrl } from '$lib/s3Public';

  // Печатающийся плейсхолдер: медленно набираем название товара, держим, стираем,
  // переходим к следующему. Останавливается, когда пользователь вводит свой запрос.
  let { placeholder = 'Поиск...', hints = [] }: { placeholder?: string; hints?: string[] } = $props();

  type SearchSuggestion = {
    type: 'category' | 'brand';
    name: string;
    url: string;
    subtitle?: string;
    score: number;
  };

  // ВАЖНО: файл в runes-режиме (из-за $props()), поэтому весь стейт — только $state.
  // Обычные let здесь не реактивны: дропдаун подсказок просто не рисуется
  // (проявилось после перехода на Svelte 5; варнинг non_reactive_update был подавлен).
  let query = $state('');
  let searchFocused = $state(false);
  let inputEl: HTMLInputElement | null | undefined;

  function setInputPlaceholder(text: string) {
    inputEl?.setAttribute('placeholder', text);
  }
  let results: any[] = $state([]);
  let open = $state(false);
  let selected = $state(-1);
  let timer: any;
  let suggestions: SearchSuggestion[] = $state([]);
  let loading = $state(false);

  async function search() {
    const value = query.trim();
    if (value.length < 2) {
      results = [];
      suggestions = [];
      open = false;
      loading = false;
      return;
    }
    loading = true;
    const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(value)}`);
    loading = false;
    if (!res.ok) {
      results = [];
      suggestions = [];
      open = false;
      return;
    }
    const data = await res.json();
    results = Array.isArray(data.products) ? data.products : [];
    suggestions = Array.isArray(data.suggestions) ? data.suggestions : [];
    open = !!(results.length || suggestions.length);
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
    selected = -1;
    loading = false;
  }

  function goToProduct(p: any) {
    const slug = slugify(p.name);
    window.location.href = `/products/${slug}`;
  }

  function goTo(url: string) {
    window.location.href = url;
  }

  function handleKey(e: KeyboardEvent) {
    if (e.key === 'Enter' && !open) {
      e.preventDefault();
      submitSearch();
      return;
    }
    if (!open) return;
    const total = suggestions.length + results.length;
    if (!total) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selected = Math.min(selected + 1, total - 1);
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      selected = Math.max(selected - 1, 0);
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (selected >= 0) {
        if (selected < suggestions.length) goTo(suggestions[selected].url);
        else goToProduct(results[selected - suggestions.length]);
      } else {
        submitSearch();
      }
    }
    if (e.key === 'Escape') {
      open = false;
      selected = -1;
    }
  }

  function submitSearch() {
    const value = query.trim();
    if (!value) return;
    loading = true;
    window.location.href = `/catalog/search?search=${encodeURIComponent(value)}`;
  }

  function handleClickOutside(e: MouseEvent) {
    const path = e.composedPath();
    if (!path.some((el: any) => el?.classList?.contains('search'))) open = false;
  }

  if (browser) {
    onMount(() => {
      document.addEventListener('click', handleClickOutside);
      onDestroy(() => document.removeEventListener('click', handleClickOutside));

      // анимация печати плейсхолдера (прямой setAttribute — без реактвности)
      if (!hints.length) return;
      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
      (async () => {
        let index = 0;
        while (true) {
          if (query.trim() || searchFocused) {
            await sleep(400);
            continue;
          }
          const hint = hints[index % hints.length];
          let text = '';
          for (let n = 1; n <= hint.length; n++) {
            if (query.trim() || searchFocused) break;
            text = hint.slice(0, n);
            setInputPlaceholder(text);
            await sleep(50 + Math.random() * 60);
          }
          if (query.trim() || searchFocused) {
            await sleep(400);
            continue;
          }
          await sleep(2200);
          while (text.length && !query.trim() && !searchFocused) {
            text = text.slice(0, -1);
            setInputPlaceholder(text);
            await sleep(20);
          }
          index++;
        }
      })();
    });
  }
</script>

<div class="search w-full lg:w-[95%]">
  <div class="input-wrap">
    <input
      class="input primary"
      type="text"
      placeholder={placeholder}
      bind:this={inputEl}
      bind:value={query}
      on:input={handleInput}
      on:keydown={handleKey}
      on:focus={() => (searchFocused = true)}
      on:blur={() => (searchFocused = false)}
    />
    {#if query}
      <button class="clear" on:click={clearInput}><X size={18} /></button>
    {/if}
    <button class="btn-search" class:loading on:click={submitSearch} disabled={loading}>
      {#if loading}
        <span class="spinner"></span>
      {:else}
        <Search size={18} />
      {/if}
    </button>
  </div>
  {#if open && (results.length || suggestions.length)}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="dropdown">
      {#each suggestions as s, i}
        <div class="item suggestion" class:selected={i === selected} on:click={() => goTo(s.url)}>
          <Folder size={18} />
          <div class="info">
            <div class="top">
              <div class="name">{s.name}</div>
            </div>
            {#if s.subtitle}
              <div class="description">{s.subtitle}</div>
            {/if}
          </div>
        </div>
      {/each}
      {#each results as r, i}
        <div
          class="item"
          class:selected={i + suggestions.length === selected}
          on:click={() => goToProduct(r)}
        >
          <img src={imgUrl(r.images?.[0]?.url, 160)} alt="" />
          <div class="info">
            <div class="top">
              <div class="name">{r.name}</div>
              <div class="brand">{r.brand_name}</div>
            </div>
            <div class="description">{r.description}</div>
          </div>
        </div>
      {/each}
      <button class="btn primary all" on:click={submitSearch}>Показать все результаты</button>
    </div>
  {/if}
</div>

<style lang="scss">
  .search {
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
        &:disabled {
          cursor: wait;
          opacity: 0.85;
        }
        .spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.45);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
      }
      .clear {
        position: absolute;
        right: 50px;
        top: 50%;
        transform: translateY(-50%);
        margin-right: 12px;
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
    padding: 12px 16px;
    cursor: pointer;
    align-items: center;
    transition: 0.15s;
    img {
      width: 50px;
      height: 50px;
      object-fit: contain;
      flex: 0 0 50px;
    }
    .info {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
      flex: 1;
      .top {
        display: flex;
        gap: 8px;
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
    // &.suggestion {
    //   svg {
    //     flex: 0 0 18px;
    //     color: $green;
    //   }
    // }
  }
  .all {
    padding: 12px 16px;
    font-size: 14px;
    border-top: 1px solid #eee;
    border-top-right-radius: 0;
    border-top-left-radius: 0;
    cursor: pointer;
    background: #fafafa;
    width: 100%;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
