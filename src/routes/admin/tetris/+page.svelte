<script lang="ts">
  import Tooltip from '$lib/components/Tooltip.svelte';

  type SyncView = {
    state: {
      status?: string;
      startedAt?: string | null;
      finishedAt?: string | null;
      source?: string | null;
      error?: string | null;
      unmatched?: string[];
      brandsDone?: number | null;
      brandsTotal?: number | null;
    };
    running: boolean;
    cooldownMs: number;
    canRun: boolean;
  };

  type ImagesView = {
    state: {
      status?: string;
      mode?: string | null;
      source?: string | null;
      startedAt?: string | null;
      updatedAt?: string | null;
      finishedAt?: string | null;
      error?: string | null;
      total?: number | null;
      done?: number | null;
      ok?: number | null;
      notFound?: number | null;
      noImage?: number | null;
      errors?: number | null;
      current?: string | null;
    };
    running: boolean;
    stale: boolean;
    stats?: { downloaded: number; without: number };
  };

  type CategoryRow = {
    name: string;
    products: number;
    excluded: boolean;
  };

  let {
    data
  }: {
    data: { brands: string[]; enabled: string[]; categories?: CategoryRow[]; sync: SyncView; images?: ImagesView; counts?: Record<string, number>; extCounts?: Record<string, number> };
  } = $props();

  let brands: string[] = $state(data.brands ?? []);
  let enabledList: string[] = $state(data.enabled ?? []);
  let categories: CategoryRow[] = $state(data.categories ?? []);
  // список исключённых категорий (галочка на строке = синхронизируется)
  let excludedList: string[] = $state(
    (data.categories ?? []).filter((c) => c.excluded).map((c) => c.name)
  );
  let counts: Record<string, number> = $state(data.counts ?? {});
  let extCounts: Record<string, number> = $state(data.extCounts ?? {});
  let sync: SyncView = $state(
    data.sync ?? { state: {}, running: false, cooldownMs: 0, canRun: true }
  );
  let images: ImagesView = $state(
    data.images ?? { state: {}, running: false, stale: false }
  );
  let imagesRunError: string = $state('');
  let brandFilter: string = $state('');
  let catFilter: string = $state('');
  let runError: string = $state('');

  function productsOf(name: string): number {
    return counts[name.toLowerCase()] ?? 0;
  }

  // товары бренда есть, но не из тетрис-синка (rusklimat, grandex-aqua, комплекты) —
  // тумблер Тетриса ими не управляет
  function isExternal(name: string): boolean {
    return productsOf(name) === 0 && (extCounts[name.toLowerCase()] ?? 0) > 0;
  }

  let saveState: '' | 'saving' | 'saved' | 'error' = $state('');
  let saveTimer: ReturnType<typeof setTimeout> | null = null;

  const enabledCount = $derived(brands.filter((b: string) => isEnabled(b)).length);
  const lastRun = $derived(sync.state ?? {});
  const unmatched = $derived(Array.isArray(lastRun.unmatched) ? lastRun.unmatched : []);

  const filteredBrands = $derived(
    brandFilter.trim()
      ? brands.filter((b: string) => b.toLowerCase().includes(brandFilter.trim().toLowerCase()))
      : brands
  );

  const filteredCategories = $derived(
    catFilter.trim()
      ? categories.filter((c) => c.name.toLowerCase().includes(catFilter.trim().toLowerCase()))
      : categories
  );
  const syncedCategoriesCount = $derived(categories.length - excludedList.length);

  function isCategoryExcluded(name: string) {
    return excludedList.some((e) => e.toLowerCase() === name.toLowerCase());
  }

  function toggleCategory(name: string) {
    excludedList = isCategoryExcluded(name)
      ? excludedList.filter((e) => e.toLowerCase() !== name.toLowerCase())
      : [...excludedList, name];
    scheduleSave();
  }

  function isEnabled(name: string) {
    // внешние бренды могли числиться включёнными со старых времён —
    // показываем выключенными: этот раздел ими не управляет
    if (isExternal(name)) return false;
    return enabledList.some((e) => e.toLowerCase() === name.toLowerCase());
  }

  function toggleBrand(name: string) {
    if (isExternal(name)) return;
    enabledList = isEnabled(name)
      ? enabledList.filter((e) => e.toLowerCase() !== name.toLowerCase())
      : [...enabledList, name];
    scheduleSave();
  }

  async function save() {
    saveState = 'saving';
    try {
      const res = await fetch('/api/admin/tetris', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: enabledList.filter((b: string) => !isExternal(b)),
          excludedCategories: excludedList
        })
      });
      if (!res.ok) throw new Error(await res.text());
      saveState = 'saved';
      setTimeout(() => {
        if (saveState === 'saved') saveState = '';
      }, 2000);
    } catch {
      saveState = 'error';
    }
  }

  function scheduleSave() {
    saveState = 'saving';
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => void save(), 600);
  }

  async function refresh() {
    try {
      const res = await fetch('/api/admin/tetris');
      if (!res.ok) return;
      const json = await res.json();
      brands = json.brands.map((b: any) => b.name);
      const nextCounts: Record<string, number> = {};
      const nextExt: Record<string, number> = {};
      for (const b of json.brands) {
        nextCounts[String(b.name).toLowerCase()] = b.products ?? 0;
        nextExt[String(b.name).toLowerCase()] = b.external ?? 0;
      }
      counts = nextCounts;
      extCounts = nextExt;
      categories = json.categories ?? [];
      // не затираем несохранённые тумблеры: включённые с сервера берём только как базу
      if (saveState !== 'saving') {
        enabledList = json.brands.filter((b: any) => b.enabled).map((b: any) => b.name);
        excludedList = (json.categories ?? []).filter((c: any) => c.excluded).map((c: any) => c.name);
      }
      sync = json.sync;
    } catch {
      // сеть моргнула — попробуем на следующем тике
    }
  }

  async function runSync() {
    runError = '';
    try {
      const res = await fetch('/api/admin/tetris/run', { method: 'POST' });
      if (!res.ok) {
        const msg = await res.json().catch(() => null);
        runError = msg?.message ?? `Ошибка ${res.status}`;
        return;
      }
      sync = { ...sync, running: true, cooldownMs: 0, state: { ...lastRun, status: 'running', startedAt: new Date().toISOString(), error: null } };
      void refresh();
    } catch (e: any) {
      runError = e?.message ?? 'Не удалось отправить запрос';
    }
  }

  // пока синк идёт или тикает кулдаун — опрашиваем статус
  $effect(() => {
    if (!(sync.running || sync.cooldownMs > 0)) return;
    const poll = setInterval(() => void refresh(), 5000);
    return () => clearInterval(poll);
  });

  const imagesState = $derived(images.state ?? {});
  const imagesStats = $derived(images.stats);
  const imagesPct = $derived(
    imagesState.total ? Math.round(((imagesState.done ?? 0) / imagesState.total) * 100) : 0
  );
  function fmtNum(n: number | null | undefined) {
    return (n ?? 0).toLocaleString('ru-RU');
  }
  const imagesLabel = $derived.by(() => {
    if (images.running) return 'Идёт синхронизация…';
    if (images.stale) return 'Процесс встал (нет обновлений > 15 мин)';
    return imagesStatusLabel[imagesState.status ?? 'idle'] ?? imagesState.status ?? '—';
  });

  async function refreshImages() {
    try {
      const res = await fetch('/api/admin/tetris/images');
      if (!res.ok) return;
      images = await res.json();
    } catch {
      // сеть моргнула — попробуем на следующем тике
    }
  }

  async function runImages() {
    imagesRunError = '';
    try {
      const res = await fetch('/api/admin/tetris/images/run', { method: 'POST' });
      if (!res.ok) {
        const msg = await res.json().catch(() => null);
        imagesRunError = msg?.message ?? `Ошибка ${res.status}`;
        return;
      }
      images = { ...images, running: true, stale: false, state: { ...imagesState, status: 'running', startedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), error: null } };
      void refreshImages();
    } catch (e: any) {
      imagesRunError = e?.message ?? 'Не удалось отправить запрос';
    }
  }

  // пока прогон картинок идёт — опрашиваем статус
  $effect(() => {
    if (!images.running) return;
    const poll = setInterval(() => void refreshImages(), 10000);
    return () => clearInterval(poll);
  });

  // локальный тик кулдауна, чтобы не ждать серверного ответа
  $effect(() => {
    if (sync.cooldownMs <= 0) return;
    const t = setInterval(() => {
      if (sync.cooldownMs > 0) sync = { ...sync, cooldownMs: Math.max(0, sync.cooldownMs - 1000) };
    }, 1000);
    return () => clearInterval(t);
  });

  function fmtCooldown(ms: number) {
    const total = Math.ceil(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function fmtDate(iso: string | null | undefined) {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  }

  const statusLabel: Record<string, string> = {
    idle: 'Ещё не запускалась',
    running: 'Идёт синхронизация…',
    done: 'Завершена',
    failed: 'Ошибка'
  };

  const imagesStatusLabel: Record<string, string> = {
    idle: 'Ещё не запускалась',
    running: 'Идёт синхронизация…',
    done: 'Завершена',
    failed: 'Ошибка'
  };
</script>

<div class="tetris-admin">
  <div class="head">
    <div>
      <h1>Tetrasis API</h1>
    </div>
    {#if saveState === 'saving'}
      <span class="save-state">Сохранение…</span>
    {:else if saveState === 'saved'}
      <span class="save-state save-state--ok">Сохранено ✓</span>
    {:else if saveState === 'error'}
      <span class="save-state save-state--err">Не сохранено ✕</span>
    {/if}
  </div>

  <!-- Синхронизация -->
  <div class="card p-6">
    <div class="card__title">Синхронизация товаров и цен</div>
    <div class="sync-row">
      <button
        class="sync-btn"
        onclick={runSync}
        disabled={sync.running || sync.cooldownMs > 0 || saveState === 'saving'}
      >
        {#if sync.running}
          Синхронизация идёт…
        {:else if sync.cooldownMs > 0}
          Доступно через {fmtCooldown(sync.cooldownMs)}
        {:else}
          Синхронизировать сейчас
        {/if}
      </button>
      <div class="sync-info">
        <div>
          Последний запуск: <b>{fmtDate(lastRun.startedAt)}</b>
          {#if lastRun.finishedAt}<span class="text-secondary"> (завершена {fmtDate(lastRun.finishedAt)})</span>{/if}
        </div>
        <div>
          Статус: <b class:ok={lastRun.status === 'done'} class:err={lastRun.status === 'failed'}>
            {(lastRun.status && statusLabel[lastRun.status]) ?? lastRun.status ?? '—'}
          </b>
          {#if lastRun.status === 'done' && lastRun.brandsTotal}
            <span class="text-secondary"> — {lastRun.brandsDone ?? '?'} из {lastRun.brandsTotal} брендов поставщика</span>
          {/if}
        </div>
        {#if lastRun.source}
        {/if}
        {#if lastRun.error}
          <div class="err">Ошибка: {lastRun.error}</div>
        {/if}
        {#if runError}
          <div class="err">{runError}</div>
        {/if}
      </div>
    </div>
    {#if unmatched.length}
      <p class="text-amber-700 mt-3">
        Бренды поставщика без сопоставления (не синхронизируются): {unmatched.join(', ')}. Чтобы
        включить, добавьте название в
        <code>scripts/sync-tetrasis-products/brands.json</code>
      </p>
    {/if}
  </div>

  <!-- Синхронизация картинок -->
  <div class="card mt-4 p-6">
    <div class="card__title">Синхронизация картинок</div>
    <div class="sync-row">
      <button class="sync-btn" onclick={runImages} disabled={images.running}>
        {#if images.running}
          Прогон картинок идёт…
        {:else}
          Синхронизировать картинки
        {/if}
      </button>
      <div class="sync-info">
        <div>
          Статус: <b
            class:ok={imagesState.status === 'done'}
            class:err={imagesState.status === 'failed' || images.stale}>{imagesLabel}</b
          >
        </div>
        <div>
          Последний запуск: <b>{fmtDate(imagesState.startedAt)}</b>
          {#if imagesState.finishedAt}<span class="text-secondary">
              (завершена {fmtDate(imagesState.finishedAt)})</span
            >{/if}
        </div>
        {#if imagesState.total && imagesState.status !== 'done'}
          <div>
            Прогресс: <b>{imagesState.done ?? 0} из {imagesState.total}</b> ({imagesPct}%)
          </div>
          <div class="progress"><div class="progress__bar" style="width:{imagesPct}%"></div></div>
        {/if}
        {#if imagesRunError}
          <div class="err">{imagesRunError}</div>
        {/if}
      </div>
    </div>
    {#snippet runCounters()}
      <div class="counters-row">
        <Tooltip text="Всего картинок в базе за всё время, включая прошлые прогоны">
          <div class="mini-counter">
            <b>{fmtNum(imagesStats?.downloaded)}</b>
            <span>Скачано картинок</span>
          </div>
        </Tooltip>
        <Tooltip text="Товары, у которых пока нет картинок: у поставщика заглушка или прогон ещё не дошёл">
          <div class="mini-counter">
            <b>{fmtNum(imagesStats?.without)}</b>
            <span>Товаров без фото</span>
          </div>
        </Tooltip>
        <Tooltip text="Товары, обработка которых упала с ошибкой в последнем прогоне — подробности в логах на сервере">
          <div class="mini-counter">
            <b>{fmtNum(imagesState.errors)}</b>
            <span>Товаров с ошибкой</span>
          </div>
        </Tooltip>
      </div>
    {/snippet}
    {#if imagesState.status === 'done'}
      <details class="run-details">
        <summary>Детали прогона</summary>
        {@render runCounters()}
      </details>
    {:else if imagesPct < 100 || !imagesState.total}
      {@render runCounters()}
    {/if}
    <p class="text-secondary mt-2">
      Прогон обрабатывает только товары без картинок: ищет их на сайте поставщика, оптимизирует
      и загружает на наш CDN. Полный прогон с заменой старых картинок — только вручную с сервера
    </p>
  </div>

  <!-- Категории -->
  <div class="card mt-4 p-6">
    <div class="card__title-row">
      <div class="card__title">Категории поставщика</div>
      <span class="text-secondary">Синхронизируется: {syncedCategoriesCount} из {categories.length}</span>
    </div>
    <input class="filter" type="text" placeholder="Поиск категории…" bind:value={catFilter} />
    <div class="brands-list">
      {#each filteredCategories as cat (cat.name)}
        <button
          type="button"
          class="brand-row"
          class:brand-row--on={!isCategoryExcluded(cat.name)}
          onclick={() => toggleCategory(cat.name)}
        >
          <span class="brand-row__check">{!isCategoryExcluded(cat.name) ? '✓' : ''}</span>
          <span class="brand-row__name">{cat.name}</span>
          {#if cat.products}
            <span class="brand-row__count">{cat.products} тов.</span>
          {:else}
            <span class="brand-row__ext">нет в базе</span>
          {/if}
        </button>
      {:else}
        <div class="empty">Ничего не найдено</div>
      {/each}
    </div>
    <p class="text-secondary mt-3">
      Галочка — категория синхронизируется. Снятая галочка — товары категории не заносятся в базу,
      а уже имеющиеся удаляются при следующей синхронизации (на сайте категория исчезает сразу
      после прогона). Список собирается из живых данных поставщика
    </p>
  </div>

  <!-- Бренды -->
  <div class="card mt-4 p-6">
    <div class="card__title-row">
      <div class="card__title">Бренды поставщика</div>
      <span class="text-secondary">Синхронизируется: {enabledCount} из {brands.length}</span>
    </div>
    <input class="filter" type="text" placeholder="Поиск бренда…" bind:value={brandFilter} />
    <div class="brands-list">
      {#each filteredBrands as brand (brand)}
        <button
          type="button"
          class="brand-row"
          class:brand-row--on={isEnabled(brand)}
          class:brand-row--ext={isExternal(brand)}
          disabled={isExternal(brand)}
          onclick={() => toggleBrand(brand)}
        >
          <span class="brand-row__check">{isEnabled(brand) ? '✓' : ''}</span>
          <span class="brand-row__name">{brand}</span>
          {#if productsOf(brand)}
            <span class="brand-row__count">{productsOf(brand)} тов.</span>
          {:else if isExternal(brand)}
            <span class="brand-row__ext">внешний синк</span>
          {/if}
        </button>
      {:else}
        <div class="empty">Ничего не найдено</div>
      {/each}
    </div>
    <p class="text-secondary mt-3">
      Зелёная галочка — бренд синхронизируется. «внешний синк» — товары
      приходят другими скриптами (Ballu/Grandex и т.п.), тумблер на них не влияет. После добавления нового бренда, картинки нужно запускать вручную
    </p>
  </div>
</div>

<style lang="scss">
  .tetris-admin {
    max-width: 56.25rem;
  }
  .head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.25rem;
    h1 {
      margin: 0 0 0.375rem;
      font-size: 1.375rem;
      color: #111827;
    }
    code {
      color: $green;
    }
  }
  .save-state {
    flex-shrink: 0;
    font-size: 0.8125rem;
    font-weight: 600;
    color: #94a3b8;
    &--ok {
      color: $green;
    }
    &--err {
      color: $error;
    }
  }
  .card {
    border: 0.0625rem solid #eee;
    border-radius: 0.875rem;
    background: #fff;
    &__title {
      font-size: 0.9375rem;
      font-weight: 700;
      color: #111827;
      margin-bottom: 0.875rem;
    }
  }
  .sync-row {
    display: flex;
    gap: 1.25rem;
    align-items: flex-start;
    flex-wrap: wrap;
  }
  .sync-btn {
    flex-shrink: 0;
    padding: 0.75rem 1.375rem;
    border: none;
    border-radius: 0.75rem;
    background: $green;
    color: #fff;
    font-size: 0.875rem;
    font-weight: 700;
    cursor: pointer;
    transition: 0.15s;
    &:hover:not(:disabled) {
      filter: brightness(1.07);
    }
    &:disabled {
      background: #e2e8f0;
      color: #94a3b8;
      cursor: not-allowed;
    }
  }
  .sync-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.8438rem;
    color: #334155;
    .ok {
      color: $green;
    }
    .err {
      color: $error;
    }
  }
  .progress {
    width: 100%;
    max-width: 26.25rem;
    height: 0.5rem;
    border-radius: 999px;
    background: #e2e8f0;
    overflow: hidden;
    margin: 0.25rem 0;
  }
  .progress__bar {
    height: 100%;
    border-radius: 999px;
    background: $green;
    transition: width 0.4s;
  }
  .counters-row {
    display: flex;
    gap: 0.75rem;
    margin: 0.75rem 0 0;
  }
  .run-details {
    margin-top: 0.625rem;
    summary {
      cursor: pointer;
      width: max-content;
      font-size: 0.8125rem;
      user-select: none;
    }
    .counters-row {
      margin-top: 0.625rem;
    }
  }
  .mini-counter {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    border: 0.0625rem solid #f1f5f9;
    border-radius: 0.625rem;
    background: #fafafa;
    cursor: help;
    white-space: nowrap;
    b {
      font-size: 0.9375rem;
      color: #111827;
    }
    span {
      font-size: 0.6875rem;
      color: #94a3b8;
    }
  }
  .filter {
    width: 100%;
    max-width: 21.25rem;
    padding: 0.625rem 0.875rem;
    margin-bottom: 0.875rem;
    border: 0.0938rem solid #e4e7ec;
    border-radius: 0.625rem;
    font-size: 0.875rem;
    outline: none;
    &:focus {
      border-color: $green;
    }
  }
  .card__title-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-bottom: 0.875rem;
    .card__title {
      margin-bottom: 0;
    }
  }
  .brands-list {
    max-height: 26.25rem;
    overflow-y: auto;
    border: 0.0625rem solid #e4e7ec;
    border-radius: 0.75rem;
    background: #fff;
    @media (max-width: 40rem) {
      max-height: 55vh;
    }
  }
  .brand-row {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: none;
    border-bottom: 0.0625rem solid #f1f5f9;
    background: none;
    font-size: 0.8438rem;
    font-weight: 600;
    color: #475569;
    text-align: left;
    cursor: pointer;
    transition: background 0.12s;
    &:last-child {
      border-bottom: none;
    }
    &:hover {
      background: #f8fafc;
    }
    &--ext {
      cursor: default;
      color: #94a3b8;
      background: #fafafa;
      &:hover {
        background: #fafafa;
      }
    }
    &--on {
      color: #111827;
      .brand-row__check {
        background: $green;
        border-color: $green;
        color: #fff;
      }
      .brand-row__name {
        color: $green;
      }
    }
  }
  .brand-row__check {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.25rem;
    height: 1.25rem;
    border: 0.0938rem solid #cbd5e1;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    line-height: 1;
    color: transparent;
    transition: 0.12s;
  }
  .brand-row__name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .brand-row__count {
    flex-shrink: 0;
    font-size: 0.75rem;
    font-weight: 600;
    color: #94a3b8;
  }
  .brand-row__ext {
    flex-shrink: 0;
    padding: 0.125rem 0.5rem;
    border-radius: 999px;
    background: rgba(230, 167, 60, 0.14);
    color: #b45309;
    font-size: 0.6875rem;
    font-weight: 700;
    white-space: nowrap;
  }
  .empty {
    padding: 1rem 0.75rem;
    color: #94a3b8;
    font-size: 0.875rem;
  }
</style>

<svelte:head>
    <title>Tetrasis API — MULTIBRAND</title>
</svelte:head>
