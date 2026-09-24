<script lang="ts">
  import { toast } from 'svelte-sonner';
  import { Search, X, Plus } from 'lucide-svelte';
  import {
    slotOfProductType,
    SLOT_LABELS,
    type PodborSlot,
    SLOT_TYPES
  } from '$lib/podborSlots';

  let {
    data
  }: {
    data: {
      config: {
        brands: { mode: 'all' | 'whitelist' | 'blacklist'; whitelist: string[]; blacklist: string[] };
        priorityProducts: string[];
      };
      allBrands: string[];
      priorityItems: {
        id: string;
        name: string;
        brand: string | null;
        product_type: string | null;
        image: string | null;
        width: number | null;
        price: number | null;
      }[];
    };
  } = $props();

  // Слот по product_type — общий маппинг с подборщиком ($lib/podborSlots)
  const slotOf = slotOfProductType;

  let mode = $state<'all' | 'whitelist' | 'blacklist'>(data.config.brands.mode);
  let selectedBrands = $state<string[]>(
    mode === 'blacklist' ? [...data.config.brands.blacklist] : [...data.config.brands.whitelist]
  );
  let priorityIds = $state<string[]>([...data.config.priorityProducts]);
  let priorityItems = $state([...data.priorityItems]);
  // Скидка за комплект (переехала из /admin/settings): включена = процент > 0
  let bundleDiscount = $state(data.discount.percent);

  let searchQuery = $state('');
  let searchResults = $state<any[]>([]);
  let searchLoading = $state(false);
  let isSaving = $state(false);
  let brandFilter = $state('');

  // Дебаунс поиска. Показываем только товары слотов викторины,
  // остальной каталог (холодильники, СВЧ и т.п.) в списке не нужен
  $effect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      searchResults = [];
      searchLoading = false;
      return;
    }
    searchLoading = true;
    const t = setTimeout(async () => {
      try {
        // podbor=1 — сервер отдаёт только товары слотов викторины
        const res = await fetch(`/api/products/search?q=${encodeURIComponent(q)}&podbor=1`);
        searchResults = await res.json();
      } catch {
        searchResults = [];
      } finally {
        searchLoading = false;
      }
    }, 300);
    return () => clearTimeout(t);
  });

  const activeBrands = $derived.by(() => {
    const list = mode === 'all' ? [] : selectedBrands;
    return list;
  });

  // Снимок исходного состояния для dirty-check
  let originalBrands = $state(
    JSON.stringify({
      mode: data.config.brands.mode,
      list: (
        data.config.brands.mode === 'blacklist'
          ? data.config.brands.blacklist
          : data.config.brands.whitelist
      ).sort()
    })
  );
  let originalPriority = $state(JSON.stringify(data.config.priorityProducts));
  let originalDiscount = $state(data.discount.percent);

  const hasChanges = $derived(
    JSON.stringify({ mode, list: [...activeBrands].sort() }) !== originalBrands ||
      JSON.stringify(priorityIds) !== originalPriority ||
      bundleDiscount !== originalDiscount
  );

  // Автосохранение: любое изменение → через 600мс уходит в БД
  let saveState = $state<'' | 'saving' | 'saved'>('');
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  function scheduleSave() {
    saveState = 'saving';
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => void save(), 600);
  }

  const filteredBrands = $derived(
    brandFilter.trim()
      ? data.allBrands.filter((b) => b.toLowerCase().includes(brandFilter.toLowerCase()))
      : data.allBrands
  );

  function setMode(m: 'all' | 'whitelist' | 'blacklist') {
    mode = m;
    scheduleSave();
  }

  // Приоритетные, сгруппированные по слотам — блок «Приоритетные товары» разбит на 4 категории
  const priorityBySlot = $derived.by(() => {
    const groups: Record<string, typeof priorityItems> = {
      hob: [],
      oven: [],
      hood: [],
      dishwasher: [],
      none: []
    };
    for (const p of priorityItems) {
      groups[slotOf(p.product_type) ?? 'none'].push(p);
    }
    return groups;
  });

  function toggleBrand(brand: string) {
    const idx = selectedBrands.findIndex((b) => b.toLowerCase() === brand.toLowerCase());
    if (idx >= 0) {
      selectedBrands = [...selectedBrands.slice(0, idx), ...selectedBrands.slice(idx + 1)];
    } else {
      selectedBrands = [...selectedBrands, brand];
    }
    scheduleSave();
  }

  function isBrandSelected(brand: string) {
    return selectedBrands.some((b) => b.toLowerCase() === brand.toLowerCase());
  }

  function addPriority(p: any) {
    const id = String(p.id);
    if (priorityIds.includes(id)) {
      toast.info('Уже в приоритетных');
      return;
    }
    priorityIds = [...priorityIds, id];
    priorityItems = [
      ...priorityItems,
      {
        id,
        name: p.name,
        brand: p.brand?.name ?? null,
        product_type: p.product_type ?? null,
        image: p.images?.[0]?.url ?? null,
        width: null,
        price: null
      }
    ];
    searchQuery = '';
    searchResults = [];
    scheduleSave();
  }

  function removePriority(id: string) {
    priorityIds = priorityIds.filter((i) => i !== id);
    priorityItems = priorityItems.filter((p) => String(p.id) !== id);
    scheduleSave();
  }

  // тост «Сохранено» — не чаще раза в 5 секунд, чтобы не спамить при автосейве
  let lastToastAt = 0;
  let toastTimer: ReturnType<typeof setTimeout> | null = null;
  function debounceToast() {
    const now = Date.now();
    const wait = Math.max(0, 5000 - (now - lastToastAt));
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      lastToastAt = Date.now();
      toast.success('Сохранено');
    }, wait);
  }

  async function save() {
    isSaving = true;
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          podbor_config: {
            brands: {
              mode,
              whitelist: mode === 'whitelist' ? selectedBrands : [],
              blacklist: mode === 'blacklist' ? selectedBrands : []
            },
            priorityProducts: priorityIds
          },
          bundle_discount_enabled: bundleDiscount > 0,
          bundle_discount_percent: bundleDiscount
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message ?? 'Save failed');
      }
      saveState = 'saved';
      debounceToast();
      // обновляем снимок «оригинала», иначе hasChanges останется true навсегда
      originalBrands = JSON.stringify({ mode, list: [...activeBrands].sort() });
      originalPriority = JSON.stringify(priorityIds);
      originalDiscount = bundleDiscount;
      setTimeout(() => {
        if (saveState === 'saved') saveState = '';
      }, 2000);
    } catch (e: any) {
      saveState = '';
      toast.error(e.message || 'Ошибка сохранения');
    }
    isSaving = false;
  }
</script>

<div class="podbor-admin">
  <div class="head">
    <div>
      <h1>Викторина «Собери кухню»</h1>
      <p class="hint">Настройка подбора на странице <a href="/podbor" target="_blank">/podbor</a>. Изменения сохраняются автоматически</p>
    </div>
    {#if saveState === 'saving'}
      <span class="save-state">Сохранение…</span>
    {:else if saveState === 'saved'}
      <span class="save-state save-state--ok">Сохранено ✓</span>
    {/if}
  </div>

  <!-- Приоритетные товары -->
  <div class="card">
    <div class="card__title">Приоритетные товары</div>
    <p class="mode-hint">
      Товары показываются в викторине первыми в своей категории — например, самые маржинальные.
      Там, где приоритетных нет, подбор добирает товары из каталога с учётом блока «Бренды» ниже.
    </p>

    {#each Object.keys(SLOT_TYPES) as slot (slot)}
      {@const items = priorityBySlot[slot]}
      <div class="slot-group">
        <div class="slot-group__title">
          {SLOT_LABELS[slot as PodborSlot]}
          <span class="slot-group__count">{items.length}</span>
        </div>
        {#if items.length}
          <div class="priority-list">
            {#each items as p (p.id)}
              <div class="priority-item">
                {#if p.image}
                  <img src={p.image} alt={p.name} loading="lazy" />
                {:else}
                  <div class="noimg">📷</div>
                {/if}
                <div class="priority-item__info">
                  <span class="priority-item__name">{p.name}</span>
                  <span class="priority-item__meta">
                    {#if p.brand}{p.brand}{/if}
                    {#if p.width}<span class="priority-item__badge">{p.width} см</span>{/if}
                    {#if p.price != null}
                      <span class="priority-item__badge priority-item__badge--price">{p.price.toLocaleString('ru-RU')} ₽</span>
                    {/if}
                  </span>
                </div>
                <button
                  type="button"
                  class="priority-item__remove"
                  title="Убрать"
                  onclick={() => removePriority(String(p.id))}
                >
                  <X size={15} strokeWidth={2.4} />
                </button>
              </div>
            {/each}
          </div>
        {:else}
          <p class="empty">Пока ничего нет — добавьте поиском ниже</p>
        {/if}
      </div>
    {/each}

    {#if priorityBySlot.none.length}
      <div class="slot-group">
        <div class="slot-group__title">
          Не для викторины
          <span class="slot-group__count">{priorityBySlot.none.length}</span>
        </div>
        <div class="priority-list">
          {#each priorityBySlot.none as p (p.id)}
            <div class="priority-item">
              {#if p.image}
                <img src={p.image} alt={p.name} loading="lazy" />
              {:else}
                <div class="noimg">📷</div>
              {/if}
              <div class="priority-item__info">
                <span class="priority-item__name">{p.name}</span>
                <span class="priority-item__meta">
                  {#if p.brand}{p.brand} · {/if}{p.product_type ?? '—'}
                </span>
              </div>
              <button
                type="button"
                class="priority-item__remove"
                title="Убрать"
                onclick={() => removePriority(String(p.id))}
              >
                <X size={15} strokeWidth={2.4} />
              </button>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <div class="search-box">
      <Search size={16} strokeWidth={2.2} />
      <input
        type="text"
        placeholder="Поиск товара (минимум 2 символа)..."
        bind:value={searchQuery}
      />
      {#if searchLoading}<span class="loading">…</span>{/if}
    </div>

    {#if searchResults.length}
      <div class="search-results">
        {#each searchResults as p (p.id)}
          <div class="search-result">
            {#if p.images?.[0]?.url}
              <img src={p.images[0].url} alt={p.name} loading="lazy" />
            {:else}
              <div class="noimg">📷</div>
            {/if}
            <div class="search-result__info">
              <span class="search-result__name">{p.name}</span>
              <span class="search-result__meta">
                {#if p.brand?.name}{p.brand.name} · {/if}{p.product_type ?? '—'}
              </span>
            </div>
            <button type="button" class="btn-add" onclick={() => addPriority(p)}>
              <Plus size={14} strokeWidth={2.4} /> Приоритет
            </button>
          </div>
        {/each}
      </div>
    {:else if searchQuery.trim().length >= 2 && !searchLoading}
      <p class="empty">Ничего не найдено</p>
    {/if}
  </div>

  <!-- Бренды -->
  <div class="card">
    <div class="card__title">Бренды для подбора</div>
    <p class="mode-hint">
      Пул брендов для автодобора в тех категориях, где приоритетных товаров не хватило.
      Приоритетные товары выбираются из любого бренда независимо от этого блока.
    </p>
    <div class="mode-switch">
      <button type="button" class:active={mode === 'all'} onclick={() => setMode('all')}>
        Все бренды
      </button>
      <button
        type="button"
        class:active={mode === 'whitelist'}
        onclick={() => setMode('whitelist')}
      >
        Только выбранные
      </button>
      <button
        type="button"
        class:active={mode === 'blacklist'}
        onclick={() => setMode('blacklist')}
      >
        Кроме выбранных
      </button>
    </div>

    {#if mode !== 'all'}
      <p class="mode-hint">
        {mode === 'whitelist'
          ? 'Викторина будет подбирать товары только этих брендов:'
          : 'Викторина будет подбирать товары всех брендов, кроме выбранных:'}
      </p>

      <div class="search-box">
        <Search size={16} strokeWidth={2.2} />
        <input type="text" placeholder="Поиск бренда..." bind:value={brandFilter} />
      </div>

      <div class="brands-grid">
        {#each filteredBrands as brand (brand)}
          <label class="brand-chip" class:brand-chip--active={isBrandSelected(brand)}>
            <input
              type="checkbox"
              checked={isBrandSelected(brand)}
              onchange={() => toggleBrand(brand)}
            />
            <span>{brand}</span>
          </label>
        {:else}
          <p class="empty">Ничего не найдено</p>
        {/each}
      </div>
      <p class="count">Выбрано: {selectedBrands.length}</p>
    {/if}
  </div>

  <!-- Скидка за комплект -->
  <div class="card">
    <div class="card__title">Скидка за комплект</div>
    <p class="mode-hint">
      Скидка на товары, добавленные в корзину из «Собери кухню». 0 — без скидки.
    </p>
    <div class="discount-row">
      <div class="discount-value" class:discount-value--on={bundleDiscount > 0}>
        <input
          type="number"
          min="0"
          max="30"
          value={bundleDiscount}
          oninput={(e) => {
            const n = Math.min(30, Math.max(0, Number((e.currentTarget as HTMLInputElement).value) || 0));
            if (n !== bundleDiscount) {
              bundleDiscount = n;
              scheduleSave();
            }
          }}
        />
        <span>%</span>
      </div>
      <span class="discount-state" class:discount-state--on={bundleDiscount > 0}>
        {bundleDiscount > 0 ? 'Скидка включена' : 'Без скидки'}
      </span>
    </div>
  </div>

</div>

<style lang="scss">
  .podbor-admin {
    max-width: 720px;
  }
  h1 {
    font-size: 22px;
    font-weight: 800;
    margin: 0 0 4px;
  }
  .hint {
    margin: 0 0 20px;
    font-size: 13px;
    color: #94a3b8;
    a {
      color: $green;
    }
  }
  .card {
    padding: 24px;
    border: 1px solid #eee;
    border-radius: 14px;
    background: #fff;
    & + .card {
      margin-top: 16px;
    }
    &__title {
      font-size: 15px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 14px;
    }
  }
  .mode-switch {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 14px;
    button {
      padding: 9px 16px;
      border-radius: 10px;
      border: 1.5px solid #e4e7ec;
      background: #fff;
      font-size: 13.5px;
      font-weight: 600;
      color: #475569;
      cursor: pointer;
      transition: 0.15s;
      &:hover {
        border-color: #cbd5e1;
      }
      &.active {
        border-color: $green;
        background: rgba($green, 0.08);
        color: $green;
      }
    }
  }
  .mode-hint {
    margin: 0 0 12px;
    font-size: 13px;
    color: #64748b;
    line-height: 1.5;
  }
  .discount-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .discount-value {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    font-weight: 600;
    color: #9aa3af;
    input {
      width: 72px;
      padding: 7px 10px;
      border: 1.5px solid #d4d8de;
      border-radius: 8px;
      background: #f4f5f7;
      font: inherit;
      font-weight: 600;
      color: #9aa3af;
      transition: all 0.15s;
    }
    &--on {
      color: $green;
      input {
        border-color: $green;
        background: #fff;
        color: $green;
      }
    }
  }
  .discount-state {
    font-size: 13px;
    color: #9aa3af;
    &--on {
      color: $green;
      font-weight: 600;
    }
  }
  .search-box {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 12px;
    margin-bottom: 14px;
    height: 40px;
    border: 1px solid #e4e7ec;
    border-radius: 10px;
    color: #94a3b8;
    input {
      flex: 1;
      border: none;
      outline: none;
      font-size: 14px;
      background: transparent;
    }
    .loading {
      font-size: 13px;
      color: #94a3b8;
    }
  }
  .brands-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding-right: 4px;
  }
  .brand-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    border: 1.5px solid #e4e7ec;
    border-radius: 999px;
    background: #fff;
    font-size: 13.5px;
    font-weight: 600;
    color: #475569;
    cursor: pointer;
    transition: 0.15s;
    input {
      display: none;
    }
    &:hover {
      border-color: #cbd5e1;
    }
    &--active {
      border-color: $green;
      background: rgba($green, 0.08);
      color: $green;
    }
  }
  .empty {
    color: #94a3b8;
    font-size: 14px;
  }
  .count {
    margin: 12px 0 0;
    font-size: 13px;
    font-weight: 600;
    color: #64748b;
  }
  .slot-group {
    margin-bottom: 18px;
    &:last-of-type {
      margin-bottom: 0;
    }
    &__title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 10px;
    }
    &__count {
      font-size: 11px;
      font-weight: 700;
      padding: 1px 7px;
      border-radius: 999px;
      background: rgba(100, 116, 139, 0.12);
      color: #64748b;
    }
  }
  .priority-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 16px;
  }
  .priority-item,
  .search-result {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px;
    border: 1px solid #e4e7ec;
    border-radius: 12px;
    background: #f8fafc;
    img,
    .noimg {
      width: 48px;
      height: 48px;
      object-fit: contain;
      border-radius: 8px;
      background: #fff;
      flex-shrink: 0;
    }
    .noimg {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    }
    &__info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
      flex: 1;
    }
    &__name {
      font-size: 13.5px;
      font-weight: 600;
      color: #1e293b;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    &__meta {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #94a3b8;
    }
    &__badge {
      padding: 1px 7px;
      border-radius: 999px;
      background: #f1f3f5;
      border: 1.5px solid #d4d8de;
      font-size: 11px;
      font-weight: 700;
      color: #475569;
      white-space: nowrap;
      &--price {
        border-color: #e6a73c;
        color: #1e293b;
      }
    }
  }
  .priority-item__remove {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: 8px;
    border: 1px solid #e4e7ec;
    background: #fff;
    color: #64748b;
    cursor: pointer;
    &:hover {
      border-color: #ef4444;
      color: #ef4444;
    }
  }
  .search-results {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .btn-add {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid #cbd5e1;
    background: #fff;
    font-size: 12.5px;
    font-weight: 700;
    color: #475569;
    cursor: pointer;
    &:hover {
      border-color: $green;
      color: $green;
    }
  }
  .head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    h1 {
      margin: 0 0 4px;
      font-size: 22px;
      font-weight: 800;
    }
  }
  .save-state {
    flex-shrink: 0;
    padding: 6px 12px;
    border-radius: 999px;
    background: #f1f5f9;
    font-size: 13px;
    color: #94a3b8;
    white-space: nowrap;
    &--ok {
      background: rgba($green, 0.1);
      color: $green;
      font-weight: 600;
    }
  }
</style>
