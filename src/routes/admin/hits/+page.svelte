<script lang="ts">
  import { toast } from 'svelte-sonner';
  import { Search, ChevronUp, ChevronDown, Trash2, ExternalLink } from 'lucide-svelte';
  import SegmentedNav from '$lib/components/SegmentedNav.svelte';
  import { imgUrl } from '$lib/s3Public';
  import { slugify } from '$lib/utils/slugify';
  import { formatPrice } from '$lib/utils/formatPrice';

  let { data }: { data: any } = $props();

  // переключатель разделов «Рекомендации / Хиты» — как «Чат / Настройки»
  const recTabs = [
    { href: '/admin/recommendations', label: 'Рекомендации' },
    { href: '/admin/hits', label: 'Хиты' }
  ];

  type ProductHit = {
    id: string;
    name: string;
    product_type: string | null;
    price_rrc: string | number | null;
    brand: any;
    image_url: string | null;
  };

  const MAX = 20;

  let items = $state<any[]>(data.items ?? []);

  let query = $state('');
  let results = $state<ProductHit[]>([]);
  let searching = $state(false);
  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  let busy = $state(false);

  // цены в БД в тысячах — форматирование ×1000 общим хелпером
  const fmtPrice = (v: string | number | null) => (v == null ? '' : `${formatPrice(v)} ₽`);
  const brandName = (b: any) => b?.name ?? '';
  const atCap = $derived(items.length >= MAX);
  const productPageUrl = (name: string) => '/products/' + slugify(name);

  async function runSearch() {
    const q = query.trim();
    if (q.length < 2) {
      results = [];
      return;
    }
    searching = true;
    try {
      const res = await fetch('/api/admin/product-search?q=' + encodeURIComponent(q));
      if (!res.ok) throw new Error();
      const d = await res.json();
      results = d.products ?? [];
    } catch {
      toast.error('Поиск не сработал, попробуй ещё раз');
    } finally {
      searching = false;
    }
  }

  const onInput = () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(runSearch, 300);
  };

  async function add(p: ProductHit) {
    if (busy || atCap) return;
    busy = true;
    try {
      const res = await fetch('/api/admin/home-hits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: p.id })
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(d.message ?? 'Не удалось добавить');
        return;
      }
      items = d.items ?? [];
      query = '';
      results = [];
      toast.success('Добавлено');
    } finally {
      busy = false;
    }
  }

  async function move(id: string, direction: 'up' | 'down') {
    if (busy) return;
    busy = true;
    try {
      const res = await fetch('/api/admin/home-hits', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: id, direction })
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(d.message ?? 'Не удалось переставить');
        return;
      }
      items = d.items ?? [];
    } finally {
      busy = false;
    }
  }

  async function remove(id: string) {
    if (busy) return;
    busy = true;
    try {
      const res = await fetch('/api/admin/home-hits', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: id })
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(d.message ?? 'Не удалось удалить');
        return;
      }
      items = d.items ?? [];
      toast.success('Удалено');
    } finally {
      busy = false;
    }
  }
</script>

<div class="hits-admin">
  <div class="page-head">
    <h1>Хиты продаж на главной</h1>
    <SegmentedNav items={recTabs} />
  </div>

  <!-- правила списка — иначе непонятно, что будет с блоком на главной -->
  <div class="rules">
    <p>Ручной список блока «Хиты продаж» на главной странице. Порядок карточек — как в списке ниже.</p>
    <ul>
      <li>Лимит — 20 товаров, меньше можно.</li>
      <li>Список пустой — блок «Хиты продаж» на главной <b>вообще не показывается</b>.</li>
      <li>Товар без цены или без фото на главной не выводится.</li>
    </ul>
  </div>

  <div class="card mt-4">
    <span class="card-label">
      В списке: {items.length} / {MAX}
      {#if atCap}
        <small class="cap-note">— лимит достигнут: убери товар, чтобы добавить новый</small>
      {/if}
    </span>

    {#if items.length === 0}
      <p class="empty">
        Список пустой — блок «Хиты продаж» на главной сейчас не показывается. Найди товар внизу и
        добавь первый.
      </p>
    {:else}
      <div class="hit-list">
        {#each items as item, i (item.id)}
          <div class="hit-row">
            <div class="hit-order">
              <button
                type="button"
                disabled={i === 0 || busy}
                onclick={() => move(item.id, 'up')}
                aria-label="Выше"
              >
                <ChevronUp size={15} strokeWidth={2.2} />
              </button>
              <button
                type="button"
                disabled={i === items.length - 1 || busy}
                onclick={() => move(item.id, 'down')}
                aria-label="Ниже"
              >
                <ChevronDown size={15} strokeWidth={2.2} />
              </button>
            </div>
            <span class="hit-pos">{i + 1}</span>
            <img src={imgUrl(item.image_url, 96)} alt="" loading="lazy" />
            <div class="hit-info">
              <a href={productPageUrl(item.name)} target="_blank" rel="noopener">{item.name}</a>
              <small
                >{brandName(item.brand)}{item.product_type ? ` · ${item.product_type}` : ''} ·
                {fmtPrice(item.price_rrc)}</small
              >
            </div>
            <a
              class="hit-link"
              href={productPageUrl(item.name)}
              target="_blank"
              rel="noopener"
              title="Открыть на сайте"
            >
              <ExternalLink size={15} strokeWidth={2.2} />
            </a>
            <button
              type="button"
              class="hit-delete"
              disabled={busy}
              onclick={() => remove(item.id)}
              aria-label="Удалить"
            >
              <Trash2 size={15} strokeWidth={2.2} />
            </button>
          </div>
        {/each}
      </div>
    {/if}

    <!-- добавление -->
    <div class="add-box">
      <span class="card-label">Добавить товар</span>
      {#if atCap}
        <p class="empty">Лимит — {MAX} товаров. Убери лишний из списка, чтобы добавить новый.</p>
      {:else}
        <div class="search-box">
          <Search size={16} strokeWidth={2.2} />
          <input
            type="text"
            placeholder="Начни печатать название — например «ASKO»..."
            bind:value={query}
            oninput={onInput}
          />
          {#if searching}<span class="spinner"></span>{/if}
        </div>
        {#if results.length}
          <div class="results">
            {#each results as p (p.id)}
              <button type="button" class="result" disabled={busy} onclick={() => add(p)}>
                <img src={imgUrl(p.image_url, 96)} alt="" loading="lazy" />
                <span class="result-name">
                  {p.name}
                  <small>{brandName(p.brand)}{p.product_type ? ` · ${p.product_type}` : ''}</small>
                </span>
                <span class="result-price">{fmtPrice(p.price_rrc)}</span>
              </button>
            {/each}
          </div>
        {:else if query.trim().length >= 2 && !searching}
          <p class="empty">Ничего не найдено — проверь написание.</p>
        {/if}
      {/if}
    </div>
  </div>
</div>

<style lang="scss">
  .hits-admin {
    max-width: 760px;
    .page-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: $sp-2;
      flex-wrap: wrap;
      margin-bottom: $sp-2;
      h1 {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 700;
        color: #111827;
      }
    }
  }
  .rules {
    padding: $sp-3 $sp-4;
    border: 1px solid rgba($green, 0.3);
    border-radius: 12px;
    background: rgba($green, 0.05);
    font-size: 0.875rem;
    line-height: 1.55;
    color: #374151;
    p {
      margin: 0;
      font-weight: 600;
    }
    ul {
      margin: $sp-1 0 0;
      padding-left: 1.1rem;
      li + li {
        margin-top: 2px;
      }
    }
  }
  .card {
    padding: $sp-4;
    border: 1px solid #eee;
    border-radius: 14px;
    background: #fff;
  }
  .card-label {
    display: block;
    margin-bottom: $sp-3;
    font-size: 0.9375rem;
    font-weight: 700;
    color: #111827;
  }
  .cap-note {
    font-weight: 400;
    color: $accent-red;
  }
  .empty {
    margin: 0;
    font-size: 0.875rem;
    color: #6b7280;
    line-height: 1.5;
  }
  .hit-list {
    display: flex;
    flex-direction: column;
    gap: $sp-2;
  }
  .hit-row {
    display: flex;
    align-items: center;
    gap: $sp-3;
    padding: $sp-2;
    border: 1px solid #f0f0f0;
    border-radius: 10px;
    img {
      width: 48px;
      height: 48px;
      object-fit: contain;
      border-radius: 8px;
      background: #fafafa;
      flex-shrink: 0;
    }
  }
  .hit-order {
    display: flex;
    flex-direction: column;
    gap: 2px;
    button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 22px;
      border: 1px solid #e4e7ec;
      border-radius: 6px;
      background: #fff;
      color: #475569;
      cursor: pointer;
      &:hover:not(:disabled) {
        background: rgba($yellow, 0.4);
      }
      &:disabled {
        opacity: 0.35;
        cursor: default;
      }
    }
  }
  .hit-pos {
    min-width: 20px;
    text-align: center;
    font-size: 0.8125rem;
    font-weight: 700;
    color: #9ca3af;
  }
  .hit-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
    a {
      font-size: 0.875rem;
      font-weight: 600;
      color: #111827;
      text-decoration: none;
      &:hover {
        text-decoration: underline;
      }
    }
    small {
      color: #6b7280;
      font-size: 0.8125rem;
    }
  }
  .hit-link {
    display: flex;
    align-items: center;
    color: #6b7280;
    &:hover {
      color: $green;
    }
  }
  .hit-delete {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: 1px solid #e4e7ec;
    border-radius: 8px;
    background: #fff;
    color: #6b7280;
    cursor: pointer;
    flex-shrink: 0;
    &:hover:not(:disabled) {
      color: $accent-red;
      border-color: $accent-red;
    }
    &:disabled {
      opacity: 0.5;
      cursor: default;
    }
  }
  .add-box {
    margin-top: $sp-4;
    padding-top: $sp-4;
    border-top: 1px solid #f0f0f0;
    .card-label {
      font-size: 0.875rem;
    }
    .search-box {
      margin-bottom: $sp-2;
    }
  }
  .search-box {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 12px;
    height: 40px;
    border: 1px solid #e4e7ec;
    border-radius: 10px;
    color: #9ca3af;
    background: #fff;
    input {
      flex: 1;
      border: 0;
      outline: none;
      font-size: 0.9375rem;
      color: #111827;
      background: transparent;
    }
  }
  .spinner {
    width: 14px;
    height: 14px;
    border: 2px solid #d1d5db;
    border-top-color: $green;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  .results {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .result {
    display: flex;
    align-items: center;
    gap: $sp-2;
    padding: 6px 8px;
    border: 1px solid #f0f0f0;
    border-radius: 10px;
    background: #fff;
    text-align: left;
    cursor: pointer;
    transition: background 0.15s ease;
    &:hover:not(:disabled) {
      background: rgba($yellow, 0.25);
    }
    &:disabled {
      opacity: 0.6;
      cursor: default;
    }
    img {
      width: 40px;
      height: 40px;
      object-fit: contain;
      border-radius: 8px;
      background: #fafafa;
      flex-shrink: 0;
    }
  }
  .result-name {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    font-size: 0.875rem;
    font-weight: 600;
    color: #111827;
    small {
      font-weight: 400;
      color: #6b7280;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
  .result-price {
    font-size: 0.8125rem;
    font-weight: 700;
    color: #111827;
    white-space: nowrap;
  }
</style>
