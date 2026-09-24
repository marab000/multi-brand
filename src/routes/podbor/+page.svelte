<script lang="ts">
  import { goto } from '$app/navigation';
  import { ChevronRight, ChevronLeft, RefreshCw, ShoppingCart } from 'lucide-svelte';
  import { cart } from '$lib/stores/cart';
  import { fireConfetti } from './confetti';

  let {
    data
  }: { data: { heroImage?: string | null; slotImages?: Record<string, string | null> } } = $props();

  const fmt = (v: number) =>
    new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(Math.round(v));

  type PickItem = {
    id: string;
    name: string;
    brand: string | null;
    productType: string | null;
    price: number | null;
    image: string | null;
    url: string;
  };
  type PickSlot = {
    slot: string;
    label: string;
    chosen: PickItem | null;
    alternatives: PickItem[];
  };
  type Result = {
    picks: PickSlot[];
    totalPrice: number;
    discountEnabled: boolean;
    discountPercent: number;
    discountTotal: number;
    finalPrice: number;
  };

  const slotMeta = [
    { key: 'hob', label: 'Варочная панель' },
    { key: 'oven', label: 'Духовой шкаф' },
    { key: 'hood', label: 'Вытяжка' },
    { key: 'dishwasher', label: 'Посудомойка' }
  ] as const;

  const budgets = [
    { value: 100000, label: 'До 100 000 ₽', hint: 'базовый набор' },
    { value: 200000, label: '100–200 тыс. ₽', hint: 'оптимально' },
    { value: 300000, label: '200–300 тыс. ₽', hint: 'комфорт+' },
    { value: 500000, label: '300 тыс. +', hint: 'премиум' }
  ];
  const widths = [
    { value: 45, label: '45 см', hint: 'узкая' },
    { value: 60, label: '60 см', hint: 'стандарт' },
    { value: 90, label: '90 см', hint: 'широкая' }
  ];
  const colors = [
    { value: 'Чёрный', swatch: '#1f2427' },
    { value: 'Белый', swatch: '#f5f5f2' },
    { value: 'Серебристый', swatch: '#c8cdd2' },
    { value: 'Бежевый', swatch: '#d9c9a8' }
  ];

  let selected = $state<Record<string, boolean>>({
    hob: true,
    oven: true,
    hood: true,
    dishwasher: true
  });
  let budget = $state(200000);
  let width = $state<number | null>(60);
  let color = $state<string | null>('Чёрный');
  let step = $state(1); // 1..4 — вопросы, 5 — результат
  let loading = $state(false);
  let error = $state('');
  let result = $state<Result | null>(null);
  // Выбранный товар на каждый слот (для «заменить»)
  let chosenBySlot = $state<Record<string, PickItem>>({});
  let swapOpen = $state<string | null>(null);

  const steps = ['Техника', 'Бюджет', 'Размер', 'Цвет'];
  // шаг 1 = заполнена первая четверть, метка «Техника» ровно под ней
  const progress = $derived(Math.min(step, steps.length) / steps.length);

  // конфетти — один залп при появлении результата
  $effect(() => {
    if (step === 5 && result) fireConfetti();
  });

  async function submit() {
    loading = true;
    error = '';
    try {
      const res = await fetch('/api/podbor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...selected, budget, width, color })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка подбора');
      result = data;
      chosenBySlot = {};
      for (const p of data.picks) {
        if (p.chosen) chosenBySlot[p.slot] = p.chosen;
      }
      step = 5;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e: any) {
      error = e.message || 'Ошибка подбора';
    } finally {
      loading = false;
    }
  }

  let finalItems = $derived(
    result
      ? result.picks
          .filter((p) => chosenBySlot[p.slot])
          .map((p) => ({ slot: p.slot, label: p.label, item: chosenBySlot[p.slot] }))
      : []
  );
  let pickedTotal = $derived(finalItems.reduce((s, i) => s + (i.item.price ?? 0), 0));
  let pickedFinal = $derived(
    result?.discountEnabled && result.discountPercent > 0
      ? Math.round(pickedTotal * (1 - result.discountPercent / 100))
      : pickedTotal
  );

  function toggleSlot(key: string) {
    selected = { ...selected, [key]: !selected[key] };
  }

  function addToCart() {
    for (const i of finalItems) {
      cart.add({
        id: i.item.id,
        name: i.item.name,
        price:
          result?.discountEnabled && result.discountPercent > 0
            ? Math.round((i.item.price ?? 0) * (1 - result.discountPercent / 100))
            : (i.item.price ?? 0),
        oldPrice:
          result?.discountEnabled && result.discountPercent > 0
            ? (i.item.price ?? undefined)
            : undefined,
        image: i.item.image ?? undefined,
        slug: i.item.url,
        bundle: true
      });
    }
    goto('/cart');
  }

  function restart() {
    step = 1;
    result = null;
    error = '';
  }
</script>

<svelte:head>
  <title>Собери кухню — подбор комплекта техники | Мультибренд Казань (MultiBrand)</title>
  <meta
    name="description"
    content="Подберите комплект встраиваемой техники под бюджет: варочная панель, духовой шкаф, вытяжка и посудомоечная машина. Скидка на комплект."
  />
</svelte:head>

<div class="wizard">
  {#if step <= 4}
    <header class="wizard__head">
      <p class="wizard__eyebrow">Конструктор кухни</p>
      <h1>Соберите кухню за минуту</h1>
      <p class="wizard__sub">
        Шаг {step} из 4 — {steps[step - 1]}. Ответьте на вопросы — подберём комплект под бюджет и
        интерьер.
      </p>
      <div class="wizard__progress">
        <div class="wizard__progress-track">
          <div class="wizard__progress-fill" style={`width: ${progress * 100}%`}></div>
          <span class="wizard__progress-tick" style="left: 25%"></span>
          <span class="wizard__progress-tick" style="left: 50%"></span>
          <span class="wizard__progress-tick" style="left: 75%"></span>
        </div>
        <ol class="wizard__progress-labels">
          {#each steps as s, i}
            <li class:done={step > i + 1} class:current={step === i + 1}>{s}</li>
          {/each}
        </ol>
      </div>
    </header>

    <div class="wizard__card">
      {#if step === 1}
        <h2>Какая техника нужна?</h2>
        <div class="wizard__slots">
          {#each slotMeta as s (s.key)}
            <button
              type="button"
              class="wizard__slot"
              class:active={selected[s.key]}
              onclick={() => toggleSlot(s.key)}
            >
              {#if data.slotImages?.[s.key]}
                <span class="wizard__slot-img">
                  <img src={data.slotImages[s.key]} alt={s.label} loading="lazy" />
                </span>
              {/if}
              <span class="wizard__slot-body">
                <span class="wizard__slot-label">{s.label}</span>
                <span class="wizard__slot-check">
                  <span class="wizard__checkbox" aria-hidden="true"></span>
                  <span class="wizard__slot-state">{selected[s.key] ? 'выбрано' : 'выбрать'}</span>
                </span>
              </span>
            </button>
          {/each}
        </div>
      {:else if step === 2}
        <h2>Бюджет комплекта</h2>
        <div class="wizard__list">
          {#each budgets as b (b.value)}
            <button
              type="button"
              class="wizard__choice"
              class:active={budget === b.value}
              onclick={() => (budget = b.value)}
            >
              <span class="wizard__radio" aria-hidden="true"></span>
              <span class="wizard__choice-body">
                <b>{b.label}</b>
                <i>{b.hint}</i>
              </span>
            </button>
          {/each}
        </div>
      {:else if step === 3}
        <h2>Ширина ниши для техники</h2>
        <div class="wizard__list wizard__list--tight">
          {#each widths as w (w.value)}
            <button
              type="button"
              class="wizard__choice"
              class:active={width === w.value}
              onclick={() => (width = w.value)}
            >
              <span class="wizard__radio" aria-hidden="true"></span>
              <span class="wizard__choice-body">
                <b>{w.label}</b>
                <i>{w.hint}</i>
              </span>
            </button>
          {/each}
        </div>
        <button
          type="button"
          class="wizard__skip"
          class:active={width === null}
          onclick={() => (width = null)}
        >
          Не знаю / не важно
        </button>
      {:else if step === 4}
        <h2>Предпочтительный цвет</h2>
        <div class="wizard__list wizard__list--tight">
          {#each colors as c (c.value)}
            <button
              type="button"
              class="wizard__choice"
              class:active={color === c.value}
              onclick={() => (color = c.value)}
            >
              <span class="wizard__swatch" style={`background: ${c.swatch}`}></span>
              <b>{c.value}</b>
              <span class="wizard__radio" aria-hidden="true"></span>
            </button>
          {/each}
        </div>
        <button
          type="button"
          class="wizard__skip"
          class:active={color === null}
          onclick={() => (color = null)}
        >
          Не важно
        </button>
      {/if}

      {#if error}
        <p class="wizard__error">{error}</p>
      {/if}

      <div class="wizard__nav">
        {#if step > 1}
          <button type="button" class="wizard__back" onclick={() => (step -= 1)}>
            <ChevronLeft size={16} /> Назад
          </button>
        {:else}
          <span></span>
        {/if}
        {#if step < 4}
          <button
            type="button"
            class="wizard__next"
            disabled={step === 1 && !Object.values(selected).some(Boolean)}
            onclick={() => (step += 1)}
          >
            Далее <ChevronRight size={16} />
          </button>
        {:else}
          <button
            type="button"
            class="wizard__next"
            disabled={loading || !Object.values(selected).some(Boolean)}
            onclick={submit}
          >
            {loading ? 'Подбираем…' : 'Подобрать комплект'}
            <ChevronRight size={16} />
          </button>
        {/if}
      </div>
    </div>
  {:else if result}
    <header class="wizard__head wizard__head--party">
      <p class="wizard__eyebrow">🎉 Поздравляем!</p>
      <h1>Ваш комплект собран</h1>
      {#if result.discountEnabled && result.discountPercent > 0}
        <p class="wizard__sub">
          Нам удалось подобрать выгодный комплект — скидка применяется автоматически
        </p>
      {:else}
        <p class="wizard__sub">Можно заменить любой товар — цена пересчитается</p>
      {/if}
    </header>

    <div class="wizard__items">
      {#each finalItems as i (i.slot)}
        <div class="wizard__item">
          <p class="wizard__item-label">{i.label}</p>
          <div class="wizard__item-main">
            <a class="wizard__item-link" href={i.item.url}>
              {#if i.item.image}
                <img src={i.item.image} alt={i.item.name} loading="lazy" />
              {:else}
                <div class="wizard__item-noimg"></div>
              {/if}
              <span class="wizard__item-info">
                <span class="wizard__item-name">{i.item.name}</span>
                {#if i.item.brand}<span class="wizard__item-brand">{i.item.brand}</span>{/if}
                <b class="wizard__item-price">{fmt(i.item.price ?? 0)} ₽</b>
              </span>
              <ChevronRight class="wizard__item-arrow" size={18} />
            </a>
            <button
              type="button"
              class="wizard__swap-btn"
              onclick={() => (swapOpen = swapOpen === i.slot ? null : i.slot)}
            >
              <RefreshCw size={13} />
              {swapOpen === i.slot ? 'Скрыть' : 'Заменить'}
            </button>
          </div>

          {#if swapOpen === i.slot}
            <div class="wizard__swaps">
              {#each result.picks.find((p) => p.slot === i.slot)?.alternatives ?? [] as alt (alt.id)}
                <button
                  type="button"
                  class="wizard__swap"
                  class:active={chosenBySlot[i.slot]?.id === alt.id}
                  onclick={() => {
                    chosenBySlot = { ...chosenBySlot, [i.slot]: alt };
                    swapOpen = null;
                  }}
                >
                  {#if alt.image}<img src={alt.image} alt={alt.name} loading="lazy" />{/if}
                  <span class="wizard__swap-name">{alt.name}</span>
                  <b>{fmt(alt.price ?? 0)} ₽</b>
                </button>
              {/each}
            </div>
          {/if}
        </div>
      {:else}
        <p class="wizard__error">Ничего не нашлось. Попробуйте изменить параметры.</p>
      {/each}
    </div>

    <div class="wizard__summary" class:wizard__summary--party={result.discountEnabled && result.discountPercent > 0}>
      {#if result.discountEnabled && result.discountPercent > 0 && pickedTotal !== pickedFinal}
        <div class="wizard__medal" aria-hidden="true">
          <b>−{result.discountPercent}%</b>
          <span>скидка</span>
        </div>
        <div class="wizard__save">
          <span class="wizard__save-old">{fmt(pickedTotal)} ₽</span>
          <span class="wizard__save-value">Вы экономите {fmt(pickedTotal - pickedFinal)} ₽</span>
        </div>
      {/if}
      <div class="wizard__total">
        <span class="wizard__total-sum">{fmt(pickedFinal)} ₽</span>
        <span class="wizard__total-note">за комплект из {finalItems.length} поз.</span>
      </div>
    </div>

    <div class="wizard__actions">
      <button type="button" class="wizard__cart" onclick={addToCart}>
        <ShoppingCart size={18} /> Добавить комплект в корзину
      </button>
      <button type="button" class="wizard__again" onclick={restart}>Изменить ответы</button>
    </div>
  {/if}
</div>

<style lang="scss">
  .wizard {
    max-width: 640px;
    margin: 0 auto;
    padding: 28px 4px 40px;

    /* ===== Шапка + прогресс ===== */
    &__head {
      text-align: center;
      margin-bottom: 18px;
    }
    &__eyebrow {
      margin: 0;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #9ca3af;

      .wizard__head--party & {
        color: $green;
      }
    }
    h1 {
      margin: 6px 0 0;
      font-size: clamp(22px, 4vw, 30px);
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #111827;
    }
    &__sub {
      margin: 8px auto 0;
      max-width: 420px;
      font-size: 14px;
      line-height: 1.5;
      color: #6b7280;
    }
    &__progress {
      margin: 18px 0 4px;
    }
    &__progress-track {
      position: relative;
      height: 5px;
      border-radius: 999px;
      background: #eceef1;
      overflow: hidden;
    }
    &__progress-fill {
      height: 100%;
      border-radius: 999px;
      background: $green;
      transition: width 0.3s ease;
    }
    // белые засечки на границах сегментов — видно, что полоса из 4 частей
    &__progress-tick {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 2px;
      margin-left: -1px;
      background: #fff;
    }
    // подписи — сетка из 4 колонок: каждая ровно под своим сегментом полосы
    &__progress-labels {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      list-style: none;
      margin: 7px 0 0;
      padding: 0;

      li {
        text-align: center;
        font-size: 12px;
        font-weight: 600;
        color: #c3c8cf;
        transition: color 0.15s;
        &.current {
          color: #111827;
        }
        &.done {
          color: $green;
        }
      }
    }

    /* ===== Карточка вопроса ===== */
    &__card {
      background: #fff;
      border: 1px solid #eceef1;
      border-radius: 20px;
      padding: 26px 24px;
      box-shadow: 0 14px 40px rgba(17, 24, 39, 0.05);

      h2 {
        margin: 0 0 16px;
        font-size: 19px;
        font-weight: 700;
        color: #111827;
      }
    }

    /* Слоты техники */
    &__slots {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      @media (max-width: 520px) {
        grid-template-columns: 1fr;
      }
    }
    &__slot {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 12px;
      border: 1.5px solid #eceef1;
      border-radius: 16px;
      background: #fafbfc;
      cursor: pointer;
      transition:
        border-color 0.15s,
        background 0.15s,
        box-shadow 0.15s;
      text-align: left;

      &-img {
        display: flex;
        justify-content: center;
        border-radius: 12px;
        background: #fff;
        img {
          width: 100%;
          height: 88px;
          object-fit: contain;
        }
      }
      &-body {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }
      &-label {
        flex: 1;
        font-size: 14.5px;
        font-weight: 700;
        color: #374151;
      }
      &-check {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        flex-shrink: 0;
      }
      &-state {
        font-size: 11px;
        font-weight: 600;
        color: #9ca3af;
      }
      .wizard__checkbox {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        flex-shrink: 0;
        border: 1.5px solid #d4d8de;
        border-radius: 6px;
        background: #fff;
        transition: all 0.15s;
        // галочка — flex-элемент: браузер сам центрует её бокс,
        // поворот вокруг центра симметрию не ломает
        &::after {
          content: '';
          display: block;
          width: 5px;
          height: 9px;
          border-right: 2px solid #fff;
          border-bottom: 2px solid #fff;
          border-bottom-right-radius: 1px;
          transform: rotate(45deg) scale(0);
          transition: transform 0.15s;
        }
      }
      &.active {
        border-color: $green;
        background: #fff;
        box-shadow: 0 6px 18px rgba($green, 0.1);
        .wizard__checkbox {
          border-color: $green;
          background: $green;
          &::after {
            transform: rotate(45deg) scale(1);
          }
        }
        .wizard__slot-state {
          color: $green;
        }
      }
    }

    /* Радио-список (бюджет/размер/цвет) */
    &__list {
      display: flex;
      flex-direction: column;
      gap: 10px;

      &--tight {
        gap: 8px;
      }
    }
    &__choice {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 13px 16px;
      border: 1.5px solid #eceef1;
      border-radius: 14px;
      background: #fafbfc;
      cursor: pointer;
      text-align: left;
      transition:
        border-color 0.15s,
        background 0.15s,
        box-shadow 0.15s;

      .wizard__choice-body {
        display: flex;
        align-items: baseline;
        gap: 8px;
        min-width: 0;
        flex: 1;
        b {
          font-size: 15px;
          font-weight: 700;
          color: #374151;
        }
        i {
          font-style: normal;
          font-size: 12.5px;
          color: #9ca3af;
        }
      }
      &:hover {
        border-color: #d4d8de;
      }
      &.active {
        border-color: $green;
        background: #fff;
        box-shadow: 0 6px 18px rgba($green, 0.1);
        .wizard__choice-body b {
          color: #14532d;
        }
        .wizard__radio {
          border-color: $green;
          box-shadow: inset 0 0 0 4px #fff;
          background: $green;
        }
      }
      .wizard__radio {
        width: 20px;
        height: 20px;
        flex-shrink: 0;
        border: 1.5px solid #d4d8de;
        border-radius: 50%;
        background: #fff;
        transition: all 0.15s;
      }
      .wizard__swatch {
        width: 26px;
        height: 26px;
        flex-shrink: 0;
        border-radius: 50%;
        border: 1px solid rgba(0, 0, 0, 0.08);
        box-shadow: inset 0 0 0 2px #fff;
      }
    }

    &__skip {
      margin-top: 10px;
      width: 100%;
      padding: 11px;
      border: 1px dashed #d4d8de;
      border-radius: 12px;
      background: transparent;
      font-size: 13.5px;
      font-weight: 600;
      color: #6b7280;
      cursor: pointer;
      transition: all 0.15s;
      &.active {
        border-color: $green;
        color: #14532d;
        background: rgba($green, 0.05);
      }
    }

    &__error {
      margin: 12px 0 0;
      color: #dc2626;
      font-size: 13.5px;
      font-weight: 600;
    }

    &__nav {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 24px;
    }
    &__back,
    &__next {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 12px 22px;
      border-radius: 12px;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    &__back {
      border: 1px solid #e5e7eb;
      background: #fff;
      color: #4b5563;
      &:hover {
        border-color: #9ca3af;
      }
    }
    &__next {
      border: 0;
      background: $green;
      color: #fff;
      box-shadow: 0 8px 20px rgba($green, 0.25);
      &:disabled {
        opacity: 0.45;
        cursor: not-allowed;
        box-shadow: none;
      }
    }

    /* ===== Результат ===== */
    &__items {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    &__item {
      background: #fff;
      border: 1px solid #eceef1;
      border-radius: 18px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;

      &-label {
        margin: 0;
        font-size: 11.5px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: #9ca3af;
      }
      &-main {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      &-link {
        display: flex;
        align-items: center;
        gap: 14px;
        text-decoration: none;
        border-radius: 12px;
        transition: background 0.15s;
        &:hover {
          background: #fafbfc;
          .wizard__item-name {
            color: $green;
          }
        }
        img,
        .wizard__item-noimg {
          width: 88px;
          height: 88px;
          object-fit: contain;
          border-radius: 12px;
          background: #fafbfc;
          flex-shrink: 0;
        }
        .wizard__item-noimg {
          border: 1px dashed #e5e7eb;
        }
      }
      &-info {
        display: flex;
        flex-direction: column;
        gap: 3px;
        min-width: 0;
        flex: 1;
      }
      &-name {
        font-size: 14.5px;
        font-weight: 700;
        color: #1f2937;
        line-height: 1.3;
      }
      &-brand {
        font-size: 12.5px;
        color: #9ca3af;
        font-weight: 600;
      }
      &-price {
        font-size: 17px;
        color: #111827;
      }
      .wizard__item-arrow {
        color: #c3c8cf;
        flex-shrink: 0;
      }
    }

    &__swap-btn {
      display: inline-flex;
      align-self: flex-start;
      align-items: center;
      gap: 5px;
      padding: 6px 12px;
      border-radius: 999px;
      border: 1px solid #e5e7eb;
      background: #fff;
      font-size: 12px;
      font-weight: 700;
      color: #4b5563;
      cursor: pointer;
      &:hover {
        border-color: $green;
        color: #14532d;
      }
    }

    &__swaps {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding-top: 10px;
      border-top: 1px dashed #eceef1;
    }
    &__swap {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px;
      border-radius: 12px;
      border: 1.5px solid #eceef1;
      background: #fafbfc;
      cursor: pointer;
      text-align: left;
      &.active {
        border-color: $green;
        background: #fff;
      }
      img {
        width: 44px;
        height: 44px;
        object-fit: contain;
        flex-shrink: 0;
      }
      b {
        margin-left: auto;
        font-size: 13.5px;
        white-space: nowrap;
      }
    }
    &__swap-name {
      font-size: 13px;
      font-weight: 600;
      color: #374151;
      min-width: 0;
    }

    &__summary {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 14px;
      margin-top: 22px;
      flex-wrap: wrap;

      /* праздничный вариант: тёплый градиент вместо нейтрального */
      &--party {
        background: linear-gradient(135deg, #f2faf3 0%, #fdf6e4 100%);
        border: 1px solid #dcefe0;
        border-radius: 20px;
        padding: 18px 22px;
        animation: summary-pop 0.45s cubic-bezier(0.22, 1.2, 0.36, 1) both;
      }
    }
    @keyframes summary-pop {
      from {
        opacity: 0;
        transform: scale(0.94);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
    /* круглая «медаль» со скидкой */
    &__medal {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 84px;
      height: 84px;
      border-radius: 50%;
      background: $green;
      color: #fff;
      box-shadow: 0 10px 26px rgba($green, 0.35);
      transform: rotate(-6deg);
      animation: medal-in 0.55s 0.15s cubic-bezier(0.22, 1.6, 0.36, 1) both;

      b {
        font-size: 26px;
        font-weight: 800;
        letter-spacing: -0.02em;
        line-height: 1;
      }
      span {
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        opacity: 0.9;
      }
    }
    @keyframes medal-in {
      from {
        opacity: 0;
        transform: rotate(-6deg) scale(0.5);
      }
      to {
        opacity: 1;
        transform: rotate(-6deg) scale(1);
      }
    }
    &__save {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    &__save-old {
      font-size: 15px;
      color: #9ca3af;
      text-decoration: line-through;
    }
    &__save-value {
      font-size: 15px;
      font-weight: 800;
      color: #14532d;
    }
    &__total {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }
    &__total-sum {
      font-size: 30px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #111827;
    }
    &__total-note {
      font-size: 13px;
      color: #6b7280;
    }

    &__actions {
      display: flex;
      gap: 12px;
      justify-content: center;
      margin-top: 16px;
      flex-wrap: wrap;
    }
    &__cart {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 14px 26px;
      border-radius: 14px;
      border: 0;
      background: $green;
      color: #fff;
      font-size: 15.5px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 8px 20px rgba($green, 0.25);
      transition: filter 0.15s;
      &:hover {
        filter: brightness(0.95);
      }
    }
    &__again {
      padding: 14px 20px;
      border-radius: 14px;
      border: 1px solid #e5e7eb;
      background: #fff;
      color: #4b5563;
      font-size: 14.5px;
      font-weight: 700;
      cursor: pointer;
    }
  }
</style>
