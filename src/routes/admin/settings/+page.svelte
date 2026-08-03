<script lang="ts">
  import { toast } from 'svelte-sonner';
  import { Save, Search } from 'lucide-svelte';

  let { data } = $props<{ data: { settings: Record<string, string>; allBrands: string[] } }>();

  let discount = $state(Number(data.settings?.cart_discount_percent ?? 15));
  let excludedBrands = $state<string[]>(
    (() => {
      try {
        return JSON.parse(data.settings?.excluded_brands ?? '[]');
      } catch {
        return [];
      }
    })()
  );
  let isSaving = $state(false);
  let searchQuery = $state('');

  // Исходные значения для сравнения
  const originalDiscount = Number(data.settings?.cart_discount_percent ?? 15);
  const originalExcluded = JSON.parse(data.settings?.excluded_brands ?? '[]');

  const hasChanges = $derived(
    discount !== originalDiscount ||
    JSON.stringify([...excludedBrands].sort()) !== JSON.stringify([...originalExcluded].sort())
  );

  const allBrands = data.allBrands;
  const filteredBrands = $derived(
    searchQuery.trim()
      ? allBrands.filter((b) => b.toLowerCase().includes(searchQuery.toLowerCase()))
      : allBrands
  );

  function toggleBrand(brand: string) {
    const normalized = brand.toLowerCase();
    const idx = excludedBrands.findIndex((b) => b.toLowerCase() === normalized);
    if (idx >= 0) {
      excludedBrands = [...excludedBrands.slice(0, idx), ...excludedBrands.slice(idx + 1)];
    } else {
      excludedBrands = [...excludedBrands, brand];
    }
  }

  function isExcluded(brand: string) {
    return excludedBrands.some((b) => b.toLowerCase() === brand.toLowerCase());
  }

  async function save() {
    if (discount < 0 || discount > 90) {
      toast.error('Скидка должна быть от 0 до 90%');
      return;
    }
    isSaving = true;
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart_discount_percent: discount,
          excluded_brands: excludedBrands
        })
      });
      if (!res.ok) throw new Error('Save failed');
      toast.success('Настройки сохранены');
    } catch {
      toast.error('Ошибка сохранения');
    }
    isSaving = false;
  }
</script>

<div class="settings-admin">
  <h1>Настройки</h1>

  <div class="settings-card">
    <div class="setting-row">
      <div class="setting-info">
        <span class="setting-label">Скидка в корзине (%)</span>
        <span class="setting-hint">
          Визуальная скидка при оформлении заказа. 0 — отключить.
        </span>
      </div>
      <div class="setting-input">
        <input type="number" min="0" max="90" bind:value={discount} />
        <span class="setting-suffix">%</span>
      </div>
    </div>
  </div>

  <div class="settings-card mt-4">
    <div class="setting-info mb-3">
      <span class="setting-label">Бренды без скидки</span>
      <span class="setting-hint">
        Отметьте бренды, на которые не будет действовать скидка в корзине.
        Защищённый ассортимент исключается автоматически.
      </span>
    </div>

    <div class="search-box">
      <Search size={16} strokeWidth={2.2} />
      <input type="text" placeholder="Поиск бренда..." bind:value={searchQuery} />
    </div>

    <div class="brands-grid">
      {#each filteredBrands as brand}
        <label class="brand-chip" class:brand-chip--active={isExcluded(brand)}>
          <input type="checkbox" checked={isExcluded(brand)} onchange={() => toggleBrand(brand)} />
          <span>{brand}</span>
        </label>
      {:else}
        <p class="brands-empty">Ничего не найдено</p>
      {/each}
    </div>

    <p class="brands-count">Выбрано: {excludedBrands.length}</p>
  </div>

  <div class="settings-actions">
    <button class="btn-save" onclick={save} disabled={isSaving || !hasChanges}>
      <Save size={17} strokeWidth={2.2} />
      {isSaving ? 'Сохранение...' : 'Сохранить'}
    </button>
  </div>
</div>

<style lang="scss">
  .settings-admin {
    max-width: 720px;
  }
  h1 {
    font-size: 22px;
    font-weight: 800;
    margin: 0 0 20px;
  }
  .mt-4 {
    margin-top: 16px;
  }
  .settings-card {
    padding: 24px;
    border: 1px solid #eee;
    border-radius: 14px;
    background: #fff;
  }
  .setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
  }
  .setting-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .setting-label {
    font-size: 15px;
    font-weight: 700;
    color: #111827;
  }
  .setting-hint {
    font-size: 13px;
    color: #94a3b8;
    line-height: 1.4;
  }
  .mb-3 {
    margin-bottom: 14px;
  }
  .setting-input {
    display: flex;
    align-items: center;
    gap: 6px;
    input {
      width: 80px;
      height: 42px;
      text-align: center;
      font-size: 18px;
      font-weight: 700;
      border: 1.5px solid #e4e7ec;
      border-radius: 10px;
      outline: none;
      &:focus {
        border-color: $green;
      }
    }
  }
  .setting-suffix {
    font-size: 16px;
    font-weight: 700;
    color: #64748b;
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
  .brands-empty {
    color: #94a3b8;
    font-size: 14px;
  }
  .brands-count {
    margin: 12px 0 0;
    font-size: 13px;
    font-weight: 600;
    color: #64748b;
  }
  .settings-actions {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
  }
  .btn-save {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 44px;
    padding: 0 22px;
    border: none;
    border-radius: 10px;
    background: $green;
    color: #fff;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    &:hover:not(:disabled) {
      filter: brightness(0.92);
    }
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
</style>
