<script lang="ts">
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

  let {
    data
  }: {
    data: { brands: string[]; enabled: string[]; sync: SyncView; counts?: Record<string, number>; extCounts?: Record<string, number> };
  } = $props();

  let brands: string[] = $state(data.brands ?? []);
  let enabledList: string[] = $state(data.enabled ?? []);
  let counts: Record<string, number> = $state(data.counts ?? {});
  let extCounts: Record<string, number> = $state(data.extCounts ?? {});
  let sync: SyncView = $state(
    data.sync ?? { state: {}, running: false, cooldownMs: 0, canRun: true }
  );
  let brandFilter: string = $state('');
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
        body: JSON.stringify({ enabled: enabledList.filter((b: string) => !isExternal(b)) })
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
      // не затираем несохранённые тумблеры: включённые с сервера берём только как базу
      if (saveState !== 'saving') {
        enabledList = json.brands.filter((b: any) => b.enabled).map((b: any) => b.name);
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
</script>

<div class="tetris-admin">
  <div class="head">
    <div>
      <h1>Тетрис — синк товаров</h1>
      <p class="hint">
        Выберите бренды поставщика, которые синхронизируются с сайтом. Товары выключенных брендов
        удаляются при следующей синхронизации. Список брендов сохраняется автоматически
      </p>
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
  <div class="card">
    <div class="card__title">Синхронизация</div>
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
          {#if lastRun.finishedAt}<span class="muted"> (завершена {fmtDate(lastRun.finishedAt)})</span>{/if}
        </div>
        <div>
          Статус: <b class:ok={lastRun.status === 'done'} class:err={lastRun.status === 'failed'}>
            {(lastRun.status && statusLabel[lastRun.status]) ?? lastRun.status ?? '—'}
          </b>
          {#if lastRun.status === 'done' && lastRun.brandsTotal}
            <span class="muted"> — {lastRun.brandsDone ?? '?'} из {lastRun.brandsTotal} брендов поставщика</span>
          {/if}
        </div>
        {#if lastRun.source}
          <div class="muted">Запуск: {lastRun.source === 'admin' ? 'из админки' : 'вручную (консоль)'}</div>
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
      <p class="mode-hint warn">
        Бренды поставщика без сопоставления (не синхронизируются): {unmatched.join(', ')}. Чтобы
        включить, добавьте название в
        <code>scripts/sync-tetrasis-products/brands.json</code>
      </p>
    {/if}
  </div>

  <!-- Бренды -->
  <div class="card">
    <div class="card__title-row">
      <div class="card__title">Бренды поставщика</div>
      <span class="count">Синхронизируется: {enabledCount} из {brands.length}</span>
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
    <p class="mode-hint">
      Зелёная галочка — бренд синхронизируется. «внешний синк» — товары
      приходят другими скриптами (Ballu/Grandex и т.п.), тумблер на них не влияет. После добавления нового бренда, картинки нужно запускать вручную
    </p>
  </div>
</div>

<style lang="scss">
  .tetris-admin {
    max-width: 900px;
  }
  .head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 20px;
    h1 {
      margin: 0 0 6px;
      font-size: 22px;
      color: #111827;
    }
  }
  .hint {
    margin: 0;
    max-width: 620px;
    font-size: 13px;
    color: #94a3b8;
    code {
      color: $green;
    }
  }
  .save-state {
    flex-shrink: 0;
    font-size: 13px;
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
  .mode-hint {
    margin: 0 0 14px;
    font-size: 13px;
    color: #64748b;
    &.warn {
      color: #b45309;
      margin-top: 14px;
    }
  }
  .sync-row {
    display: flex;
    gap: 20px;
    align-items: flex-start;
    flex-wrap: wrap;
  }
  .sync-btn {
    flex-shrink: 0;
    padding: 12px 22px;
    border: none;
    border-radius: 12px;
    background: $green;
    color: #fff;
    font-size: 14px;
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
    gap: 4px;
    font-size: 13.5px;
    color: #334155;
    .muted {
      color: #94a3b8;
    }
    .ok {
      color: $green;
    }
    .err {
      color: $error;
    }
  }
  .filter {
    width: 100%;
    max-width: 340px;
    padding: 10px 14px;
    margin-bottom: 14px;
    border: 1.5px solid #e4e7ec;
    border-radius: 10px;
    font-size: 14px;
    outline: none;
    &:focus {
      border-color: $green;
    }
  }
  .card__title-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 14px;
    .card__title {
      margin-bottom: 0;
    }
  }
  .brands-list {
    max-height: 420px;
    overflow-y: auto;
    border: 1px solid #e4e7ec;
    border-radius: 12px;
    background: #fff;
    @media (max-width: 640px) {
      max-height: 55vh;
    }
  }
  .brand-row {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 8px 12px;
    border: none;
    border-bottom: 1px solid #f1f5f9;
    background: none;
    font-size: 13.5px;
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
    width: 20px;
    height: 20px;
    border: 1.5px solid #cbd5e1;
    border-radius: 6px;
    font-size: 12px;
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
    font-size: 12px;
    font-weight: 600;
    color: #94a3b8;
  }
  .brand-row__ext {
    flex-shrink: 0;
    padding: 2px 8px;
    border-radius: 999px;
    background: rgba(230, 167, 60, 0.14);
    color: #b45309;
    font-size: 11px;
    font-weight: 700;
    white-space: nowrap;
  }
  .empty {
    padding: 16px 12px;
    color: #94a3b8;
    font-size: 14px;
  }
  .count {
    margin: 14px 0 0;
    font-size: 13px;
    font-weight: 600;
    color: #64748b;
  }
</style>

<svelte:head>
  <title>Тетрис — синк товаров — MULTIBRAND</title>
</svelte:head>
