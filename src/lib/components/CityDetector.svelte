<script lang="ts">
  import { onMount } from 'svelte';
  import { slide } from 'svelte/transition';
  import { MapPin, X, Check, ChevronDown } from 'lucide-svelte';

  const STORAGE_KEY = 'user_city';
  const POPULAR_CITIES = [
    'Казань', 'Москва', 'Санкт-Петербург', 'Набережные Челны', 'Уфа', 'Нижнекамск',
    'Елабуга', 'Чистополь', 'Бугульма', 'Лениногорск', 'Зеленодольск', 'Альметьевск',
    'Нижний Новгород', 'Самара', 'Саратов', 'Тольятти', 'Пенза', 'Ульяновск',
    'Чебоксары', 'Йошкар-Ола', 'Ижевск', 'Киров', 'Пермь', 'Екатеринбург',
    'Челябинск', 'Тюмень', 'Омск', 'Новосибирск', 'Краснодар', 'Ростов-на-Дону',
    'Волгоград', 'Воронеж', 'Тула', 'Ярославль', 'Тверь', 'Калуга'
  ];

  let selectedCity = $state('');
  let detectedCity = $state('');
  let showModal = $state(false);
  let showDropdown = $state(false);
  let searchQuery = $state('');

  const emit = () => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('city:change', { detail: selectedCity }));
  };

  const saveCity = (city: string) => {
    selectedCity = city;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, city);
    }
    showModal = false;
    showDropdown = false;
    emit();
  };

  const filteredCities = $derived(
    searchQuery.trim()
      ? POPULAR_CITIES.filter((c) => c.toLowerCase().includes(searchQuery.toLowerCase()))
      : POPULAR_CITIES
  );

  onMount(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      selectedCity = saved;
      emit();
      return;
    }
    // Определяем город через бесплатный API
    fetch('https://ipapi.co/json/')
      .then((r) => r.json())
      .then((data) => {
        detectedCity = data?.city || '';
        if (detectedCity) {
          showModal = true;
        } else {
          // Не смогли определить — показываем Казань по умолчанию
          selectedCity = 'Казань';
          saveCity('Казань');
        }
      })
      .catch(() => {
        selectedCity = 'Казань';
        saveCity('Казань');
      });
  });

  const confirmCity = () => saveCity(detectedCity || 'Казань');
  const rejectCity = () => {
    showModal = false;
    showDropdown = true;
  };
</script>

<!-- Кнопка в шапке -->
<div class="city-selector">
  <button type="button" class="city-btn" onclick={() => (showDropdown = !showDropdown)}>
    <MapPin size={16} strokeWidth={2.1} />
    <span>{selectedCity || 'Казань'}</span>
    <ChevronDown size={14} strokeWidth={2.2} />
  </button>

  {#if showDropdown}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="city-backdrop" onclick={() => (showDropdown = false)}></div>
    <div class="city-dropdown" transition:slide={{ duration: 180 }}>
      <div class="city-search">
        <input
          type="text"
          placeholder="Поиск города"
          bind:value={searchQuery}
        />
      </div>
      <div class="city-list">
        {#each filteredCities as city}
          <button
            type="button"
            class="city-option"
            class:city-option--active={city === selectedCity}
            onclick={() => saveCity(city)}
          >
            <span>{city}</span>
            {#if city === selectedCity}
              <Check size={16} strokeWidth={2.4} />
            {/if}
          </button>
        {:else}
          <p class="city-empty">Город не найден</p>
        {/each}
      </div>
    </div>
  {/if}
</div>

<!-- Модалка подтверждения города -->
{#if showModal}
  <div class="city-modal-overlay" transition:slide={{ duration: 200 }}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="city-modal" onclick={(e) => e.stopPropagation()}>
      <button class="city-modal__close" onclick={() => (showModal = false)} aria-label="Закрыть">
        <X size={18} strokeWidth={2.2} />
      </button>
      <div class="city-modal__icon">
        <MapPin size={28} strokeWidth={2} />
      </div>
      <h3>Ваш город — {detectedCity || 'Казань'}?</h3>
      <div class="city-modal__actions">
        <button class="city-modal__yes" onclick={confirmCity}>
          <Check size={16} strokeWidth={2.4} />
          Да, верно
        </button>
        <button class="city-modal__no" onclick={rejectCity}>Выбрать другой</button>
      </div>
    </div>
  </div>
{/if}

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
    font-size: 13px;
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
  .city-dropdown {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    z-index: 50;
    width: 240px;
    border-radius: 12px;
    background: #fff;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
    border: 1px solid #eee;
    overflow: hidden;
  }
  .city-search {
    padding: 10px;
    border-bottom: 1px solid #f1f1f1;
    input {
      width: 100%;
      height: 36px;
      padding: 0 10px;
      border: 1px solid #e4e7ec;
      border-radius: 8px;
      font-size: 13px;
      outline: none;
      &:focus {
        border-color: $green;
      }
    }
  }
  .city-list {
    max-height: 220px;
    overflow-y: auto;
    padding: 4px;
  }
  .city-option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 9px 10px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: #1d2939;
    font-size: 13.5px;
    font-weight: 600;
    text-align: left;
    cursor: pointer;
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
  .city-empty {
    padding: 14px 10px;
    color: #94a3b8;
    font-size: 13px;
    text-align: center;
    margin: 0;
  }
  .city-modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.4);
    padding: 20px;
  }
  .city-modal {
    position: relative;
    width: 100%;
    max-width: 380px;
    padding: 32px 28px 28px;
    border-radius: 20px;
    background: #fff;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
    text-align: center;
  }
  .city-modal__close {
    position: absolute;
    top: 14px;
    right: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 50%;
    background: #f5f5f5;
    color: #64748b;
    cursor: pointer;
    transition: 0.15s ease;
    &:hover {
      background: #e8e8e8;
      color: #333;
    }
  }
  .city-modal__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    margin: 0 auto 18px;
    border-radius: 50%;
    background: rgba($green, 0.1);
    color: $green;
  }
  .city-modal h3 {
    margin: 0 0 24px;
    font-size: 20px;
    font-weight: 800;
    color: #111827;
    line-height: 1.3;
  }
  .city-modal__actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .city-modal__yes {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 46px;
    border: none;
    border-radius: 12px;
    background: $green;
    color: #fff;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    transition: filter 0.15s ease;
    &:hover {
      filter: brightness(0.9);
    }
  }
  .city-modal__no {
    height: 42px;
    border: 1px solid #e4e7ec;
    border-radius: 12px;
    background: #fff;
    color: #475569;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: 0.15s ease;
    &:hover {
      background: #f8f8f8;
    }
  }
</style>
