<script lang="ts">
  // Селектор города в мобильной шапке. Архитектура: город определяется сервером
  // по поддомену (msk. → Москва, ufa. → Уфа, основной домен → Казань, см.
  // cityPlaceholders.currentCityFromHost). Поэтому «выбор города» = переход на
  // поддомен с тем же путём. Никакого localStorage и ipapi-детекта: город живёт
  // на сервере и приходит пропсом из layout-данных (+layout.server.ts).
  import { slide } from 'svelte/transition';
  import { MapPin, Check, ChevronDown } from 'lucide-svelte';
  import { SITE_URL } from '$lib/config/site';

  let { city = 'Казань' } = $props<{ city?: string }>();

  // поддомен → город (на основном домене поддомена нет)
  const CITIES = [
    { name: 'Казань', sub: '' },
    { name: 'Уфа', sub: 'ufa.' },
    { name: 'Москва', sub: 'msk.' }
  ];

  let open = $state(false);

  const currentCity = $derived(city || 'Казань');

  const hrefFor = (sub: string) => {
    const base = sub ? `https://${sub}multi-brand.online` : SITE_URL;
    if (typeof window === 'undefined') return base;
    const { pathname, search } = window.location;
    return `${base}${pathname}${search}`;
  };
</script>

<!-- Кнопка в шапке: список раскрывается прилегающим под кнопкой -->
<div class="city-selector">
  <button type="button" class="city-btn" onclick={() => (open = !open)}>
    <MapPin size={16} strokeWidth={2.1} />
    <span>{currentCity}</span>
    <ChevronDown size={14} strokeWidth={2.2} />
  </button>

  {#if open}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="city-backdrop" onclick={() => (open = false)}></div>
    <div class="city-dropdown" transition:slide={{ duration: 180 }}>
      <div class="city-list">
        {#each CITIES as city (city.name)}
          <a class="city-option" href={hrefFor(city.sub)}>
            <span>{city.name}</span>
            {#if city.name === currentCity}
              <Check size={16} strokeWidth={2.4} />
            {/if}
          </a>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style lang="scss">
  .city-selector {
    position: relative;
  }
  .city-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border: none;
    background: transparent;
    color: #64748b;
    font-size: 0.8125rem;
    font-weight: 600;
    cursor: pointer;
    transition: color 0.15s ease;
    white-space: nowrap;
    :global(svg) {
      &:first-child {
        color: $green;
      }
      &:last-child {
        color: #94a3b8;
      }
    }
    &:hover {
      color: $green;
    }
  }
  .city-backdrop {
    position: fixed;
    inset: 0;
    z-index: 40;
  }
  // прилегающий список: строго под кнопкой (top 100% + 8px), влево от кнопки
  .city-dropdown {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    z-index: 50;
    width: 240px;
    border-radius: 12px;
    background: #fff;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
    border: 1px solid #eee;
    overflow: hidden;
  }
  .city-list {
    padding: 4px;
  }
  .city-option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 10px 12px;
    border-radius: 8px;
    color: #1d2939;
    font-size: 0.875rem;
    font-weight: 600;
    text-align: left;
    text-decoration: none;
    transition: background 0.12s ease;
    :global(svg) {
      color: $green;
    }
    &:hover {
      background: #f5f5f5;
    }
    &--active {
      color: $green;
    }
  }
</style>
