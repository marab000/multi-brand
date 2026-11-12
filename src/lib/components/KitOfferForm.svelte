<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import {
    Check,
    ChevronRight,
    Flame,
    Gem,
    Percent,
    ShieldCheck,
    Truck,
    Warehouse
  } from 'lucide-svelte';
  import { toast } from 'svelte-sonner';
  import { apiFetch } from '$lib/api';
  import { phoneMask } from '$lib/actions/phoneMask';
  import { isValidRuPhone, normalizeRuPhone } from '$lib/utils/phone';
  import oven from '$lib/assets/links/oven.webp';
  import hob from '$lib/assets/links/hob.webp';
  import dw from '$lib/assets/links/dw.webp';
  import hood from '$lib/assets/links/hood.webp';

  // блок «Зафиксировать выгоду за комплект» по референсу заказчика: зелёная
  // карточка, чекбоксы комплекта, счётчик 24 часа, телефон + жёлтая CTA,
  // на мобилке — модалка успеха (второй референс).

  const tiles = [
    { img: oven, label: 'Духовой шкаф' },
    { img: hob, label: 'Варочная панель' },
    { img: dw, label: 'Посудомоечная машина' },
    { img: hood, label: 'Вытяжка' }
  ];

  const perks = [
    { icon: ShieldCheck, text: 'Официальная гарантия\nот производителя' },
    { icon: Truck, text: 'Быстрая доставка\nи установка' },
    { icon: Gem, text: 'Премиальные бренды\nв одном комплекте' },
    { icon: Percent, text: 'Выгодные условия\nдля вашего ремонта' }
  ];

  let phone = $state('');
  let loading = $state(false);
  let successOpen = $state(false);

  // чекбоксы комплекта: по умолчанию выбраны все, клик по плитке переключает
  let selected = $state<string[]>(tiles.map((t) => t.label));

  const isSelected = (label: string) => selected.includes(label);
  const toggleTile = (label: string) => {
    selected = isSelected(label)
      ? selected.filter((l) => l !== label)
      : [...selected, label];
  };

  // остаток акции: дн / ч / мин, тикаем каждую секунду — счётчик «живой»
  let leftDays = $state('00');
  let leftHours = $state('00');
  let leftMins = $state('00');

  const pad2 = (n: number) => String(Math.max(0, n)).padStart(2, '0');

  // личный 24-часовой дедлайн визита: стартует с первого захода и живёт
  // в localStorage — перезагрузки его не сбрасывают
  const DEADLINE_KEY = 'kitoffer-deadline';
  let deadline = 0;

  const tick = () => {
    const ms = deadline - Date.now();
    if (deadline && ms <= 0) {
      leftDays = leftHours = leftMins = '00';
      return;
    }
    const mins = Math.floor(ms / 60000);
    leftDays = pad2(Math.floor(mins / 1440));
    leftHours = pad2(Math.floor((mins % 1440) / 60));
    leftMins = pad2(mins % 60);
  };

  onMount(() => {
    const saved = Number(localStorage.getItem(DEADLINE_KEY));
    deadline = saved && saved > Date.now() ? saved : Date.now() + 24 * 60 * 60 * 1000;
    localStorage.setItem(DEADLINE_KEY, String(deadline));
    tick();
    const t = setInterval(tick, 1000);
    onDestroy(() => clearInterval(t));
  });

  const submit = async () => {
    if (loading) return;
    if (!isValidRuPhone(phone)) {
      toast.error('Введите корректный номер телефона');
      return;
    }
    loading = true;
    try {
      await apiFetch(fetch, '/api/leads', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Клиент (зафиксировать выгоду за комплект)',
          phone: normalizeRuPhone(phone),
          message: `Зафиксировать скидку и расчёт комплекта. Выбрано: ${
            selected.length ? selected.join(', ') : 'ничего'
          }. Бесплатное хранение на складе М-7, проверка ниши, доставка и установка.`,
          source: 'kit-fix'
        }),
        headers: { 'Content-Type': 'application/json' }
      });
      window.ym?.(108518016, 'reachGoal', 'lead_submit');
      successOpen = true;
      phone = '';
    } catch {
      toast.error('Не удалось отправить заявку');
    } finally {
      loading = false;
    }
  };
</script>

<section class="kitoffer mx-auto">
  <div class="kitoffer__top">
    <span class="kitoffer__brand">MULTI-BRAND</span>
    <span class="kitoffer__top-divider" aria-hidden="true"></span>
    <span class="kitoffer__top-note">Встраиваемая техника<br />для вашего дома</span>
  </div>

  <div class="kitoffer__grid">
    <div class="kitoffer__main">
      <h2>Соберите комплект техники<br /><em>и увеличьте выгоду</em></h2>
      <p class="kitoffer__storage">
        <Warehouse size={20} strokeWidth={1.8} />
        <span>Бесплатное хранение на складе М-7 в Казани<br /><i>до конца ремонта</i></span>
      </p>
      <div class="kitoffer__tiles">
        {#each tiles as t (t.label)}
          <button
            type="button"
            class="kitoffer__tile"
            class:kitoffer__tile--off={!isSelected(t.label)}
            aria-pressed={isSelected(t.label)}
            onclick={() => toggleTile(t.label)}
          >
            <span class="kitoffer__check"><Check size={13} strokeWidth={3} /></span>
            <img src={t.img} alt={t.label} loading="lazy" />
            <span class="kitoffer__tile-label">{t.label}</span>
          </button>
        {/each}
      </div>
    </div>

    <div class="kitoffer__side">
      <div class="kitoffer__saving">
        <div class="kitoffer__saving-head">
          <span>Ваша выгода<br />за комплект:</span>
          <i>13</i>
        </div>
        <div class="kitoffer__saving-sum">
          <span>Экономия</span>
          <b>38 400 ₽</b>
        </div>
      </div>
      <div class="kitoffer__timer">
        <div class="kitoffer__timer-label">
          <Flame size={16} strokeWidth={2} />
          <span>До конца акции осталось:</span>
        </div>
        <div class="kitoffer__timer-cells">
          <span>{leftDays} <i>дн.</i></span>
          <span>{leftHours} <i>ч.</i></span>
          <span>{leftMins} <i>мин.</i></span>
        </div>
      </div>
    </div>

    <form class="kitoffer__form" onsubmit={(e) => { e.preventDefault(); submit(); }}>
      <div class="kitoffer__phone">
        <span class="kitoffer__phone-prefix">+7</span>
        <input
          type="tel"
          placeholder="999 123 45 67"
          autocomplete="tel"
          inputmode="numeric"
          bind:value={phone}
          use:phoneMask={{ value: phone, onAccept: (digits) => (phone = digits) }}
          disabled={loading}
        />
      </div>
      <button type="submit" class="btn-gold kitoffer__submit" disabled={loading}>
        {loading ? 'Отправляем...' : 'Зафиксировать скидку и расчет'}
        <ChevronRight size={18} strokeWidth={2.3} />
      </button>
    </form>

    <div class="kitoffer__perks">
      {#each perks as p (p.text)}
        <div class="kitoffer__perk">
          <p.icon size={18} strokeWidth={1.8} />
          <!-- текст с \n: строки референса, перенос без br в разметке -->
          <span>{p.text}</span>
        </div>
      {/each}
    </div>
  </div>
</section>

{#if successOpen}
  <button class="kitoffer__overlay" type="button" aria-label="Закрыть" onclick={() => (successOpen = false)}></button>
  <div class="kitoffer__success" role="dialog" aria-modal="true" aria-label="Выгода зафиксирована">
    <span class="kitoffer__success-check"><Check size={30} strokeWidth={3} /></span>
    <h3>Выгода<br />зафиксирована!</h3>
    <p>Эксперт Павел уже формирует спецификацию с учётом бесплатных схем встройки под ваш проект.</p>
    <div class="kitoffer__success-box">
      <span><Check size={14} strokeWidth={2.6} /> Бронь спецификации закреплена за вашим номером</span>
      <span><Check size={14} strokeWidth={2.6} /> Бесплатное хранение на складе М-7 активировано</span>
    </div>
    <button type="button" class="kitoffer__success-btn" onclick={() => (successOpen = false)}
      >Отлично, понятно</button
    >
  </div>
{/if}

<style lang="scss">
  .kitoffer {
    // секция = одна карточка; зелёное «стекло» светлее референса не делаем —
    // референс светлее чёрного: средне-тёмный зелёный с диагональным светом
    padding: clamp($sp-4, 3.5vw, $sp-8);
    border: 1px solid rgba(212, 166, 56, 0.4);
    border-radius: 24px;
    background: linear-gradient(150deg, #2a6a47 0%, #1a4d31 48%, #103823 100%);
    color: #fff;

    &__top {
      display: flex;
      align-items: center;
      gap: $sp-3;
    }
    &__brand {
      font-size: 0.95rem;
      font-weight: 600;
      letter-spacing: 0.22em;
    }
    &__top-divider {
      width: 1px;
      height: 26px;
      background: rgba(255, 255, 255, 0.25);
    }
    &__top-note {
      color: rgba(255, 255, 255, 0.8);
      font-size: 0.72rem;
      line-height: 1.3;
    }

    &__grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: $sp-4;
      margin-top: $sp-4;
      @media (min-width: 1024px) {
        grid-template-columns: minmax(0, 1fr) minmax(0, 340px);
        gap: $sp-6;
      }
    }

    &__main {
      display: flex;
      flex-direction: column;
      gap: $sp-3;
      min-width: 0;
    }

    h2 {
      // color явно: глобальная typography красит все h2 в #141414
      margin: 0;
      color: #fff;
      font-size: clamp(1.5rem, 2.6vw, 2.25rem);
      line-height: 1.12;
      font-weight: 600;
      letter-spacing: -0.02em;
      em {
        font-style: normal;
        color: #eec86a;
      }
    }

    &__storage {
      display: flex;
      align-items: center;
      gap: $sp-2;
      margin: 0;
      font-size: 0.875rem;
      line-height: 1.35;
      svg {
        flex-shrink: 0;
        color: #8fd6a2;
      }
      i {
        font-style: normal;
        color: rgba(255, 255, 255, 0.75);
      }
    }

    &__tiles {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
      @media (max-width: 639px) {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    &__tile {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 12px 10px 10px;
      border: 1px solid rgba(212, 166, 56, 0.3);
      border-radius: 12px;
      background: rgba(3, 18, 11, 0.55);
      cursor: pointer;
      transition:
        border-color 0.15s ease,
        opacity 0.15s ease;
      img {
        height: 74px;
        width: auto;
        max-width: 100%;
        object-fit: contain;
      }
      // чекбокс выключен: гасим рамку, чек и подпись
      &--off {
        border-color: rgba(212, 166, 56, 0.14);
        .kitoffer__check {
          opacity: 0;
        }
        .kitoffer__tile-label {
          color: rgba(255, 255, 255, 0.55);
        }
      }
    }
    &__check {
      position: absolute;
      top: 8px;
      right: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #27b563;
      color: #fff;
      transition: opacity 0.15s ease;
    }
    &__tile-label {
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.95);
      text-align: center;
    }

    &__side {
      display: flex;
      flex-direction: column;
      gap: $sp-3;
      // колонка на всю высоту строки: выгода и таймер делят её поровну
      > * {
        flex: 1;
      }
    }

    &__saving {
      padding: $sp-3 $sp-4;
      border-radius: 14px;
      background: #f5c623;
      color: #201a05;
      &-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: $sp-2;
        font-size: 0.72rem;
        font-weight: 600;
        line-height: 1.25;
        text-transform: uppercase;
        i {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: #1e2413;
          color: #f5c623;
          font-size: 0.85rem;
          font-style: normal;
        }
      }
      &-sum {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: $sp-2;
        margin-top: $sp-2;
        span {
          font-size: 1rem;
          font-weight: 700;
        }
        b {
          font-size: clamp(1.6rem, 2.4vw, 2.1rem);
          line-height: 1;
          letter-spacing: -0.02em;
        }
      }
    }

    &__timer {
      padding: $sp-3 $sp-4;
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 14px;
      background: rgba(3, 18, 11, 0.55);
      &-label {
        display: flex;
        align-items: center;
        gap: $sp-2;
        font-size: 0.8rem;
        color: rgba(255, 255, 255, 0.95);
        svg {
          color: #f5a623;
        }
      }
      &-cells {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
        margin-top: 10px;
        span {
          display: flex;
          align-items: baseline;
          justify-content: center;
          gap: 4px;
          padding: 8px 4px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.07);
          font-size: 1.35rem;
          font-weight: 600;
          i {
            font-size: 0.7rem;
            font-style: normal;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.75);
          }
        }
      }
    }

    // форма и преимущества — отдельные строки на всю ширину сетки, не колонки
    &__form {
      grid-column: 1 / -1;
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 12px;
      @media (min-width: 640px) {
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      }
    }
    &__phone {
      display: flex;
      align-items: stretch;
      height: 52px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.08);
      overflow: hidden;
      // стандартная маска сайта: префикс +7 + imask 000 000 00 00 (см. PrivilegesSection)
      .kitoffer__phone-prefix {
        display: inline-flex;
        align-items: center;
        padding: 0 12px;
        border-right: 1px solid rgba(255, 255, 255, 0.16);
        color: rgba(255, 255, 255, 0.9);
        font-size: 1rem;
        font-weight: 600;
      }
      input {
        flex: 1;
        padding: 0 $sp-3;
        background: transparent;
        border: 0;
        outline: none;
        color: #fff;
        font-size: 1rem;
        &::placeholder {
          color: rgba(255, 255, 255, 0.6);
        }
      }
    }
    &__submit {
      // форма/капсула — общие (.btn-gold); паддинг обязателен: btn-gold сам его не задаёт
      height: 52px;
      padding: 0 24px;
      justify-content: center;
      font-size: 0.95rem;
    }

    &__perks {
      grid-column: 1 / -1;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px $sp-4;
      padding-top: $sp-3;
      border-top: 1px solid rgba(255, 255, 255, 0.14);
      @media (min-width: 1024px) {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }
    }
    &__perk {
      display: flex;
      align-items: center;
      gap: $sp-2;
      font-size: 0.75rem;
      line-height: 1.3;
      color: rgba(255, 255, 255, 0.95);
      white-space: pre-line;
      svg {
        flex-shrink: 0;
        color: #cfa236;
      }
    }

    // --- успех (мобильный референс): тёмная модалка со светящимся чеком ---
    &__overlay {
      position: fixed;
      inset: 0;
      z-index: 1000;
      border: 0;
      padding: 0;
      background: rgba(3, 12, 8, 0.72);
      backdrop-filter: blur(6px);
      cursor: default;
    }
    &__success {
      position: fixed;
      top: 50%;
      left: 50%;
      z-index: 1001;
      width: min(420px, calc(100vw - 32px));
      padding: $sp-6 $sp-4;
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 20px;
      background: linear-gradient(170deg, rgba(9, 36, 22, 0.96), rgba(5, 22, 14, 0.97));
      color: #fff;
      text-align: center;
      transform: translate(-50%, -50%);
      h3 {
        margin: $sp-3 0 0;
        font-size: 1.5rem;
        line-height: 1.15;
        font-weight: 600;
      }
      p {
        margin: $sp-2 0 0;
        font-size: 0.875rem;
        line-height: 1.45;
        color: rgba(255, 255, 255, 0.75);
      }
    }
    &__success-check {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: radial-gradient(circle at 50% 40%, #34d073, #14904d);
      color: #fff;
      box-shadow:
        0 0 24px rgba(52, 208, 115, 0.55),
        0 0 60px rgba(52, 208, 115, 0.25);
    }
    &__success-box {
      display: grid;
      gap: 8px;
      margin-top: $sp-4;
      padding: $sp-3 $sp-4;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.07);
      text-align: left;
      span {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        font-size: 0.8rem;
        line-height: 1.35;
        color: rgba(255, 255, 255, 0.85);
        svg {
          flex-shrink: 0;
          margin-top: 2px;
          color: #4ade80;
        }
      }
    }
    &__success-btn {
      width: 100%;
      height: 48px;
      margin-top: $sp-4;
      border: 1px solid rgba(255, 255, 255, 0.35);
      border-radius: 12px;
      background: linear-gradient(180deg, rgba(15, 61, 31, 0.6), rgba(9, 40, 22, 0.6));
      color: #fff;
      font-size: 0.9rem;
      font-weight: 700;
      &:hover {
        border-color: rgba(255, 255, 255, 0.6);
      }
    }
  }
</style>
