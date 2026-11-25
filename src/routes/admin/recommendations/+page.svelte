<script lang="ts">
  import { toast } from 'svelte-sonner';
  import { onMount, tick } from 'svelte';
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
  type RecItem = {
    id: string;
    recommended_product_id: string;
    note: string | null;
    position: number;
    name: string;
    product_type: string | null;
    price_rrc: string | number | null;
    brand: any;
    image_url: string | null;
  };
  type LinkedProduct = ProductHit & { rec_count: string | number };

  // цены в БД в тысячах — форматирование ×1000 общим хелпером
  const fmtPrice = (v: string | number | null) => (v == null ? '' : `${formatPrice(v)} ₽`);
  const brandName = (b: any) => b?.name ?? '';

  // ─── левая колонка: поиск + «уже настроены» ───
  let baseQuery = $state('');
  let baseResults = $state<ProductHit[]>([]);
  let baseSearching = $state(false);
  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  // режим списка: печатаем ≥2 символов — показываем результаты, иначе — настроенные
  const isSearchMode = $derived(baseQuery.trim().length >= 2);

  // ─── выбранный товар и его связки ───
  let baseProduct = $state<ProductHit | null>(null);
  let items = $state<RecItem[]>([]);

  // ─── обзор: товары, у которых уже есть рекомендации ───
  let linked = $state<LinkedProduct[]>([]);

  // ─── добавление рекомендации ───
  let addQuery = $state('');
  let addResults = $state<ProductHit[]>([]);
  let addSearching = $state(false);
  let addTimer: ReturnType<typeof setTimeout> | undefined;
  let busy = $state(false);

  // как в чатах: <900px — одна колонка, редактор раскрывается под списком
  let isMobile = $state(false);
  const syncViewport = () => (isMobile = window.matchMedia('(max-width: 900px)').matches);
  let editorEl: HTMLElement | undefined = $state();

  async function reloadLinked() {
    try {
      const res = await fetch('/api/admin/recommendations?overview=1');
      if (!res.ok) throw new Error();
      const d = await res.json();
      linked = d.linked ?? [];
    } catch {
      // обзор не критичен — при следующем действии догрузится
    }
  }
  onMount(() => {
    void reloadLinked();
    syncViewport();
    window.addEventListener('resize', syncViewport);
    return () => window.removeEventListener('resize', syncViewport);
  });

  const recCount = (p: LinkedProduct) => Number(p.rec_count ?? 0);

  async function runSearch(
    q: string,
    setResults: (r: ProductHit[]) => void,
    setSearching: (v: boolean) => void
  ) {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch('/api/admin/recommendations?q=' + encodeURIComponent(q.trim()));
      if (!res.ok) throw new Error();
      const d = await res.json();
      setResults(d.products ?? []);
    } catch {
      toast.error('Поиск не сработал, попробуй ещё раз');
    } finally {
      setSearching(false);
    }
  }

  const onBaseInput = () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(
      () =>
        runSearch(
          baseQuery,
          (r) => (baseResults = r),
          (v) => (baseSearching = v)
        ),
      300
    );
  };
  const onAddInput = () => {
    clearTimeout(addTimer);
    addTimer = setTimeout(
      () =>
        runSearch(
          addQuery,
          (r) => (addResults = r),
          (v) => (addSearching = v)
        ),
      300
    );
  };

  async function pickBase(p: ProductHit) {
    // повторный клик по выбранному на мобилке — свернуть редактор (как в чатах)
    if (baseProduct?.id === p.id && isMobile) {
      deselect();
      return;
    }
    baseProduct = p;
    baseQuery = '';
    baseResults = [];
    items = [];
    await reloadItems();
    if (isMobile) {
      await tick();
      editorEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function deselect() {
    baseProduct = null;
    items = [];
    addQuery = '';
    addResults = [];
  }

  async function reloadItems() {
    if (!baseProduct) return;
    try {
      const res = await fetch('/api/admin/recommendations?productId=' + baseProduct.id);
      if (!res.ok) throw new Error();
      const d = await res.json();
      items = d.items ?? [];
    } catch {
      toast.error('Не удалось загрузить рекомендации');
    }
  }

  async function addRecommendation(p: ProductHit) {
    if (!baseProduct || busy) return;
    if (p.id === baseProduct.id) {
      toast.error('Товар не может рекомендовать сам себя');
      return;
    }
    busy = true;
    try {
      const res = await fetch('/api/admin/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: baseProduct.id, recommendedProductId: p.id })
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(d.message ?? 'Не удалось добавить');
        return;
      }
      items = d.items ?? [];
      addQuery = '';
      addResults = [];
      toast.success('Добавлено');
      void reloadLinked();
    } finally {
      busy = false;
    }
  }

  async function move(item: RecItem, direction: 'up' | 'down') {
    if (busy) return;
    busy = true;
    try {
      const res = await fetch('/api/admin/recommendations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, direction })
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

  async function saveNote(item: RecItem, note: string) {
    if ((item.note ?? '') === note.trim() || busy) return;
    busy = true;
    try {
      const res = await fetch('/api/admin/recommendations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, note })
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(d.message ?? 'Не удалось сохранить подпись');
        return;
      }
      items = d.items ?? [];
      toast.success('Подпись сохранена');
    } finally {
      busy = false;
    }
  }

  async function remove(item: RecItem) {
    if (busy) return;
    busy = true;
    try {
      const res = await fetch('/api/admin/recommendations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id })
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(d.message ?? 'Не удалось удалить');
        return;
      }
      items = d.items ?? [];
      toast.success('Удалено');
      void reloadLinked();
    } finally {
      busy = false;
    }
  }

  const productPageUrl = (name: string) => '/products/' + slugify(name);
</script>

{#snippet editor()}
  <div class="picked">
    <img src={imgUrl(baseProduct!.image_url, 96)} alt="" loading="lazy" />
    <div class="picked-info">
      <b>{baseProduct!.name}</b>
      <small
        >{brandName(baseProduct!.brand)}{baseProduct!.product_type
          ? ` · ${baseProduct!.product_type}`
          : ''}</small
      >
    </div>
    <span class="picked-price">{fmtPrice(baseProduct!.price_rrc)}</span>
    <a
      class="picked-link"
      href={productPageUrl(baseProduct!.name)}
      target="_blank"
      rel="noopener"
      title="Открыть на сайте"
    >
      <ExternalLink size={15} strokeWidth={2.2} />
    </a>
  </div>

  <div class="card mt-4">
    <span class="card-label">
      Рекомендации ({items.length}){items.length > 4
        ? ' — больше 4: в блоке карточки будет два ряда'
        : ''}
    </span>

    {#if items.length === 0}
      <p class="empty">
        Пока пусто — внизу найди товар и добавь. Нет связей → карточка показывает автоподбор.
      </p>
    {:else}
      <div class="rec-list">
        {#each items as item, i (item.id)}
          <div class="rec-row">
            <div class="rec-order">
              <button
                type="button"
                disabled={i === 0 || busy}
                onclick={() => move(item, 'up')}
                aria-label="Выше"
              >
                <ChevronUp size={15} strokeWidth={2.2} />
              </button>
              <button
                type="button"
                disabled={i === items.length - 1 || busy}
                onclick={() => move(item, 'down')}
                aria-label="Ниже"
              >
                <ChevronDown size={15} strokeWidth={2.2} />
              </button>
            </div>
            <img src={imgUrl(item.image_url, 96)} alt="" loading="lazy" />
            <div class="rec-info">
              <a href={productPageUrl(item.name)} target="_blank" rel="noopener">{item.name}</a>
              <small
                >{brandName(item.brand)}{item.product_type ? ` · ${item.product_type}` : ''} ·
                {fmtPrice(item.price_rrc)}</small
              >
              <input
                class="note-input"
                type="text"
                placeholder="Подпись для покупателя — например «Парная сушильная машина»"
                value={item.note ?? ''}
                onblur={(e) => saveNote(item, e.currentTarget.value)}
                onkeydown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                }}
              />
            </div>
            <button
              type="button"
              class="rec-delete"
              disabled={busy}
              onclick={() => remove(item)}
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
      <span class="card-label">Добавить рекомендуемый товар</span>
      <div class="search-box">
        <Search size={16} strokeWidth={2.2} />
        <input
          type="text"
          placeholder="Начни печатать название..."
          bind:value={addQuery}
          oninput={onAddInput}
        />
        {#if addSearching}<span class="spinner"></span>{/if}
      </div>
      {#if addResults.length}
        <div class="results">
          {#each addResults as p (p.id)}
            <button
              type="button"
              class="result"
              disabled={busy}
              onclick={() => addRecommendation(p)}
            >
              <img src={imgUrl(p.image_url, 96)} alt="" loading="lazy" />
              <span class="result-name">
                {p.name}
                <small>{brandName(p.brand)}{p.product_type ? ` · ${p.product_type}` : ''}</small>
              </span>
              <span class="result-price">{fmtPrice(p.price_rrc)}</span>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </div>
{/snippet}

<div class="rec-admin">
  <div class="page-head">
    <h1>Рекомендации товаров</h1>
    <SegmentedNav items={recTabs} />
  </div>
  <p class="page-hint">
    Ручные связки «С этим товаром покупают»: выбери товар слева и добавь к нему рекомендованные.
    Есть связи — блок в карточке показывает только их, нет — работает автоподбор. Оптимально 4
    позиции: столько влезает в блок на десктопе.
  </p>

  <div class="rec-wrap" class:rec-wrap--mobile={isMobile}>
    <!-- левая колонка: поиск + список настроенных, всегда на виду -->
    <div class="rec-left">
      <div class="search-box">
        <Search size={16} strokeWidth={2.2} />
        <input
          type="text"
          placeholder="Найти товар — например «ASKO»..."
          bind:value={baseQuery}
          oninput={onBaseInput}
        />
        {#if baseSearching}<span class="spinner"></span>{/if}
      </div>

      {#if isSearchMode}
        <div class="list-label">Результаты поиска</div>
        {#if baseResults.length}
          <div class="results">
            {#each baseResults as p (p.id)}
              <button
                type="button"
                class="result"
                class:result--active={baseProduct?.id === p.id}
                onclick={() => pickBase(p)}
              >
                <img src={imgUrl(p.image_url, 96)} alt="" loading="lazy" />
                <span class="result-name">
                  {p.name}
                  <small>{brandName(p.brand)}{p.product_type ? ` · ${p.product_type}` : ''}</small>
                </span>
                <span class="result-price">{fmtPrice(p.price_rrc)}</span>
              </button>
            {/each}
          </div>
        {:else if !baseSearching}
          <p class="empty">Ничего не найдено — проверь написание.</p>
        {/if}
      {:else}
        <div class="list-label">Уже настроены ({linked.length})</div>
        {#if linked.length}
          <div class="results">
            {#each linked as p (p.id)}
              <button
                type="button"
                class="result"
                class:result--active={baseProduct?.id === p.id}
                onclick={() => pickBase(p)}
              >
                <img src={imgUrl(p.image_url, 96)} alt="" loading="lazy" />
                <span class="result-name">
                  {p.name}
                  <small>{brandName(p.brand)}{p.product_type ? ` · ${p.product_type}` : ''}</small>
                </span>
                <span class="linked-count">{recCount(p)}</span>
              </button>
            {/each}
          </div>
        {:else}
          <p class="empty">
            Пока ни один товар не настроен. Найди товар через поиск, добавь рекомендации — он
            появится в этом списке.
          </p>
        {/if}
      {/if}
    </div>

    <!-- правая колонка: редактор выбранного товара (десктоп) -->
    {#if !isMobile}
      <div class="rec-right">
        {#if baseProduct}
          {@render editor()}
        {:else}
          <div class="placeholder">Выбери товар слева — или найди его через поиск.</div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- мобилка: редактор раскрывается под списком, «К списку» сворачивает -->
  {#if isMobile && baseProduct}
    <div class="editor-mobile" bind:this={editorEl}>
      <div class="editor-mobile__head">
        <span>Настройка связок</span>
        <button type="button" onclick={deselect}>К списку</button>
      </div>
      {@render editor()}
    </div>
  {/if}
</div>

<style lang="scss">
  .rec-admin {
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
  .page-hint {
    margin: 0 0 $sp-4;
    font-size: 0.875rem;
    color: #6b7280;
    line-height: 1.5;
    max-width: 720px;
  }
  // master-detail как в чатах: список слева всегда, редактор справа;
  // <900px — одна колонка, редактор уезжает под список
  .rec-wrap {
    display: grid;
    grid-template-columns: 340px minmax(0, 1fr);
    gap: $sp-3;
    align-items: start;
    &--mobile {
      grid-template-columns: 1fr;
    }
  }
  .rec-left {
    display: flex;
    flex-direction: column;
    gap: $sp-2;
    min-width: 0;
  }
  .rec-right {
    min-width: 0;
  }
  .list-label {
    margin-top: $sp-1;
    font-size: 0.8125rem;
    font-weight: 700;
    color: #6b7280;
  }
  .placeholder {
    padding: $sp-6 $sp-4;
    border: 1px dashed #d1d5db;
    border-radius: 14px;
    background: #fff;
    color: #9ca3af;
    font-size: 0.9375rem;
    text-align: center;
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
    &--active {
      background: rgba($yellow, 0.5);
      border-color: rgba($yellow, 0.7);
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
  .linked-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 22px;
    height: 22px;
    padding: 0 7px;
    border-radius: 999px;
    background: rgba($green, 0.12);
    color: $green;
    font-size: 0.75rem;
    font-weight: 700;
  }
  .picked {
    display: flex;
    align-items: center;
    gap: $sp-3;
    padding: $sp-2;
    border: 1px solid #e4e7ec;
    border-radius: 10px;
    background: #fff;
    img {
      width: 48px;
      height: 48px;
      object-fit: contain;
      border-radius: 8px;
      background: #fafafa;
      flex-shrink: 0;
    }
  }
  .picked-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    b {
      font-size: 0.9375rem;
      color: #111827;
    }
    small {
      color: #6b7280;
    }
  }
  .picked-price {
    font-size: 0.875rem;
    font-weight: 700;
    color: #111827;
    white-space: nowrap;
  }
  .picked-link {
    display: flex;
    align-items: center;
    color: #6b7280;
    &:hover {
      color: $green;
    }
  }
  .empty {
    margin: 0;
    font-size: 0.875rem;
    color: #6b7280;
    line-height: 1.5;
  }
  .rec-list {
    display: flex;
    flex-direction: column;
    gap: $sp-2;
  }
  .rec-row {
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
  .rec-order {
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
  .rec-info {
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
  .note-input {
    margin-top: 4px;
    height: 32px;
    padding: 0 10px;
    border: 1px solid #e4e7ec;
    border-radius: 8px;
    font-size: 0.8125rem;
    color: #111827;
    outline: none;
    &:focus {
      border-color: $green;
    }
    &::placeholder {
      color: #9ca3af;
    }
  }
  .rec-delete {
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
  // мобилка: редактор под списком с шапкой и кнопкой возврата
  .editor-mobile {
    margin-top: $sp-3;
    &__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: $sp-2;
      margin-bottom: $sp-2;
      span {
        font-size: 0.9375rem;
        font-weight: 700;
        color: #111827;
      }
      button {
        padding: $sp-1 $sp-3;
        border: 1px solid #e4e7ec;
        border-radius: 8px;
        background: #fff;
        color: #475569;
        font-size: 0.8125rem;
        font-weight: 600;
        cursor: pointer;
        &:hover {
          background: rgba($yellow, 0.4);
        }
      }
    }
  }
</style>
