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
  let contacts = $state((() => {
    try {
      return JSON.parse(data.settings?.site_contacts ?? '{}');
    } catch {
      return {};
    }
  })() as { phoneDigits?: string; tgLink?: string; maxLink?: string; pavelName?: string; pavelPhone?: string; email?: string });

  const originalContacts = JSON.stringify(contacts);
  let isSaving = $state(false);
  let searchQuery = $state('');

  // Исходные значения для сравнения
  const originalDiscount = Number(data.settings?.cart_discount_percent ?? 15);
  const originalExcluded = JSON.parse(data.settings?.excluded_brands ?? '[]');

  const hasChanges = $derived(
    discount !== originalDiscount ||
    JSON.stringify([...excludedBrands].sort()) !== JSON.stringify([...originalExcluded].sort()) ||
    JSON.stringify(contacts) !== originalContacts
  );

  const allBrands = data.allBrands;
  const filteredBrands = $derived(
    searchQuery.trim()
      ? allBrands.filter((b: string) => b.toLowerCase().includes(searchQuery.toLowerCase()))
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
          excluded_brands: excludedBrands,
          site_contacts: {
            phoneDigits: contacts.phoneDigits ?? '',
            tgLink: contacts.tgLink ?? '',
            maxLink: contacts.maxLink ?? '',
            pavelName: contacts.pavelName ?? '',
            pavelPhone: contacts.pavelPhone ?? '',
            email: contacts.email ?? ''
          }
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
      <div class="setting-input setting-input--discount" class:setting-input--on={discount > 0}>
        <input type="number" min="0" max="90" bind:value={discount} />
        <span class="setting-suffix">%</span>
        <span class="setting-state">{discount > 0 ? 'Скидка включена' : 'Без скидки'}</span>
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

  <div class="settings-card mt-4">
    <div class="setting-info mb-3">
      <span class="setting-label">Контакты сайта</span>
      <span class="setting-hint">
        Телефон, мессенджеры и менеджер на сайте, в КП и письмах. Телефон — с восьмёрки,
        11 цифр. Пустое поле = значение по умолчанию.
      </span>
    </div>

    <div class="contacts-grid">
      <label class="contact-field">
        <span>Телефон</span>
        <input type="text" placeholder="88001019771" bind:value={contacts.phoneDigits} />
      </label>
      <label class="contact-field">
        <span>Email</span>
        <input type="text" placeholder="shop@mail.ru" bind:value={contacts.email} />
      </label>
      <label class="contact-field">
        <span>Ссылка Telegram</span>
        <input type="text" placeholder="https://t.me/..." bind:value={contacts.tgLink} />
      </label>
      <label class="contact-field">
        <span>Ссылка MAX</span>
        <input type="text" placeholder="https://max.ru/u/..." bind:value={contacts.maxLink} />
      </label>
      <label class="contact-field">
        <span>Менеджер — имя</span>
        <input type="text" placeholder="Павел" bind:value={contacts.pavelName} />
      </label>
      <label class="contact-field">
        <span>Менеджер — телефон</span>
        <input type="text" placeholder="+79276707817" bind:value={contacts.pavelPhone} />
      </label>
    </div>
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
    &--discount input {
      background: #f4f5f7;
      color: #9aa3af;
      transition: all 0.15s;
    }
    &--on {
      input {
        background: #fff;
        color: $green;
        border-color: $green;
      }
      .setting-state {
        color: $green;
      }
    }
  }
  .setting-state {
    margin-left: 6px;
    font-size: 13px;
    color: #9aa3af;
  }
  .setting-suffix {
    font-size: 16px;
    font-weight: 700;
    color: #64748b;
  }
  .toggle {
    position: relative;
    display: inline-block;
    width: 46px;
    height: 26px;
    flex-shrink: 0;
    input {
      opacity: 0;
      width: 0;
      height: 0;
      &:checked + .toggle-slider {
        background: $green;
      }
      &:checked + .toggle-slider::before {
        transform: translateX(20px);
      }
    }
  }
  .toggle-slider {
    position: absolute;
    inset: 0;
    border-radius: 999px;
    background: #cbd5e1;
    transition: 0.2s;
    cursor: pointer;
    &::before {
      content: '';
      position: absolute;
      top: 3px;
      left: 3px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #fff;
      transition: 0.2s;
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
  }
  .contacts-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
    @media (max-width: 40rem) {
      grid-template-columns: 1fr;
    }
  }
  .contact-field {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    span {
      font-size: 0.78125rem;
      color: #64748b;
    }
    input {
      width: 100%;
      padding: 0.625rem 0.875rem;
      border: 1.5px solid #e4e7ec;
      border-radius: 0.625rem;
      font-size: 0.875rem;
      outline: none;
      &:focus {
        border-color: $green;
      }
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

<svelte:head>
  <title>Скидка — MULTIBRAND</title>
</svelte:head>
