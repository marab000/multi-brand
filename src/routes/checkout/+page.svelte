<script lang="ts">
  import type { PageData } from './$types';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { cart } from '$lib/stores/cart';
  import { deliveryMethod } from '$lib/stores/deliveryMethod';
  import { imgUrl } from '$lib/s3Public';
  import { formatPrice } from '$lib/utils/formatPrice';
  import { applyCartDiscount, isDiscountExcludedBrand } from '$lib/utils/pricing';
  import { apiFetch } from '$lib/api';
  import { toast } from 'svelte-sonner';
  import BonusIcon from '$lib/components/BonusIcon.svelte';
  import DeliveryToggle from '$lib/components/DeliveryToggle.svelte';
  import { Menu, Phone } from 'lucide-svelte';
  import { phoneMask } from '$lib/actions/phoneMask';
  import { getPhoneLocalDigits, isValidRuPhone, normalizeRuPhone } from '$lib/utils/phone';
  import { SITE_PHONE, SITE_PHONE_HREF } from '$lib/config/site';
  let { data } = $props<{ data: PageData }>();
  let nameInput: HTMLInputElement;
  let phoneInput: HTMLInputElement;
  let streetInput: HTMLInputElement;
  let name = data.user?.full_name ?? '';
  let phone = getPhoneLocalDigits(data.user?.phone);
  let email = data.user?.email ?? '';
  let street = $state('');
  let apt = $state('');
  let entrance = $state('');
  let floor = $state('');
  let comment = $state('');
  let agreed = $state(false);
  const cartDiscountPercent = data.cartDiscountPercent ?? 0;
  const excludedBrands = data.excludedBrands ?? [];
  let method = $state<'delivery' | 'pickup'>('delivery');
  $effect(() => {
    const unsub = deliveryMethod.subscribe((v) => (method = v));
    return unsub;
  });
  const reachGoal = (goal: string) => {
    if (typeof window === 'undefined') return;
    window.ym?.(108518016, 'reachGoal', goal);
  };
  function focusField(el: HTMLElement) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.focus();
  }
  let payment = $state<'now' | '6' | '12'>('now');
  const submit = async () => {
    if (!name.trim()) {
      toast.error('Введите имя');
      focusField(nameInput);
      return;
    }
    if (!isValidRuPhone(phone)) {
      toast.error('Введите корректный номер телефона');
      focusField(phoneInput);
      return;
    }
    if (method === 'delivery' && !street.trim()) {
      toast.error('Укажите улицу и дом для доставки');
      focusField(streetInput);
      return;
    }
    if (!agreed) {
      toast.error('Подтвердите согласие на обработку персональных данных');
      return;
    }
    const items = $cart.map((i) => ({
      id: i.id,
      name: i.name,
      price: i.price,
      oldPrice: i.oldPrice ?? null,
      qty: i.qty,
      slug: i.slug ?? null
    }));
    const addressParts = [
      `ул. ${street.trim()}`,
      apt.trim() && `кв./офис ${apt.trim()}`,
      entrance.trim() && `подъезд ${entrance.trim()}`,
      floor.trim() && `этаж ${floor.trim()}`
    ].filter(Boolean);
    try {
      const res = await apiFetch<{ ok: boolean; id: string }>(fetch, '/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          name,
          phone: normalizeRuPhone(phone),
          items,
          message: [
            method === 'delivery'
              ? `Доставка: по Казани (бесплатно), ${addressParts.join(', ')}`
              : 'Доставка: самовывоз, Казань, ул. Чистопольская, 66',
            `Оплата: ${payment === 'now' ? 'оплата сразу' : `рассрочка ${payment} мес. 0%`}`,
            email.trim() && `Email: ${email.trim()}`,
            comment.trim() && `Комментарий: ${comment.trim()}`,
            hasBonusWriteOff && `Бонусы: списано ${formatPrice(bonusWriteOff)} ₽ в счёт оплаты`,
            bonusMessage
          ].filter(Boolean).join('\n')
        }),
        headers: { 'Content-Type': 'application/json' }
      });
      reachGoal('cart_submit');
      // данные для экрана успеха (читает /checkout/success)
      sessionStorage.setItem(
        'checkout_success',
        JSON.stringify({
          id: res?.id ?? '',
          items: $cart.map((i) => ({ name: i.name, qty: i.qty, price: i.price })),
          total,
          bonusWriteOff,
          payable,
          method
        })
      );
      cart.clear();
      await goto('/checkout/success');
    } catch {
      toast.error('Ошибка при оформлении заказа');
    }
  };
  // Скидка корзины показывается бонусами: начисляем баллы и списываем в счёт оплаты
  const itemDiscountedPrice = (i: {
    price: number;
    qty: number;
    brand?: string | null;
    protected?: boolean;
  }) =>
    isDiscountExcludedBrand(i.brand, i.protected, excludedBrands)
      ? i.price
      : applyCartDiscount(i.price, cartDiscountPercent);
  const total = $derived($cart.reduce((sum, i) => sum + i.price * i.qty, 0));
  const totalWithDiscount = $derived(
    $cart.reduce((sum, i) => sum + itemDiscountedPrice(i) * i.qty, 0)
  );
  const bonusWriteOff = $derived(Math.max(0, total - totalWithDiscount));
  const hasBonusWriteOff = $derived(bonusWriteOff > 0);
  const payable = $derived(total - bonusWriteOff);
  const itemsCount = $derived($cart.reduce((sum, i) => sum + i.qty, 0));
  // Бонус за комплект (п.15): суммарная выгода по товарам из конструктора
  const bundleBonus = $derived(
    $cart.reduce((sum, i) => sum + (i.bundle && i.oldPrice && i.oldPrice > i.price ? (i.oldPrice - i.price) * i.qty : 0), 0)
  );
  const bonusMessage = bundleBonus > 0
    ? `Оставьте заявку, чтобы получить ${formatPrice(bundleBonus)} ₽ баллами`
    : '';
  onMount(() => {
    cart.sync();
  });
</script>

<svelte:head>
  <title>Оформление заказа | MULTIBRAND</title>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>


<div class="cart-page">
  {#if $cart.length === 0}
    <div class="empty-state mb-4">
      <h2>Корзина пуста</h2>
      <p>Добавьте товары в корзину, чтобы оформить заказ</p>
      <a class="btn primary gap-3" href="/catalog"><Menu size={18} />Перейти в каталог</a>
    </div>
  {:else}
    <h1 class="pt-3 pb-1">Оформление заказа</h1>
    <p class="subtitle">Укажите контакты и способ получения</p>
    <div class="cart mb-3 flex flex-col gap-3 lg:mb-4 lg:grid lg:gap-5">
      <div class="main-col flex flex-col gap-3">
        <section class="block">
          <div class="block__head">
            <h2>Ваш заказ</h2>
            <a class="block__link" href="/cart">Изменить количество</a>
          </div>
          <div class="order-items">
            {#each $cart as item (item.id)}
              <div class="item">
                <a
                  class="image-link"
                  href={item.slug ? `/products/${item.slug}` : undefined}
                  aria-label={item.name}
                >
                  <img src={imgUrl(item.image, 160)} alt={item.name} />
                </a>
                <div class="info">
                  <a class="name" href={item.slug ? `/products/${item.slug}` : undefined}>
                    {item.name}
                  </a>
                  {#if item.color || item.qty > 1}
                    <p class="sub">{[item.color, `${item.qty} шт.`].filter(Boolean).join(' · ')}</p>
                  {/if}
                </div>
                <p class="sum">{formatPrice(item.price * item.qty)} ₽</p>
              </div>
            {/each}
          </div>
        </section>

        <section class="block">
          <div class="block__head">
            <h2>Контакты получателя</h2>
          </div>
          <div class="fields">
            <input
              class="input primary"
              placeholder="Имя"
              bind:value={name}
              bind:this={nameInput}
            />
            <div class="with-prefix">
              <span class="prefix">+7</span>
              <input
                class="input primary"
                placeholder="Телефон"
                autocomplete="tel"
                inputmode="numeric"
                value={phone}
                bind:this={phoneInput}
                use:phoneMask={{ value: phone, onAccept: (digits) => (phone = digits) }}
              />
            </div>
            <input
              class="input primary"
              type="email"
              placeholder="Электронная почта — необязательно"
              bind:value={email}
            />
          </div>
        </section>

        <section class="block">
          <div class="block__head">
            <h2>Получение заказа</h2>
          </div>
          <DeliveryToggle />
          {#if method === 'delivery'}
            <div class="fields">
              <input class="input primary" value="Казань" aria-label="Город" disabled />
              <input
                class="input primary"
                placeholder="Улица и дом"
                bind:value={street}
                bind:this={streetInput}
              />
              <div class="fields-row">
                <input class="input primary" placeholder="Квартира / офис" bind:value={apt} />
                <input class="input primary" placeholder="Подъезд" bind:value={entrance} />
                <input class="input primary" placeholder="Этаж" bind:value={floor} />
              </div>
            </div>
            <p class="hint">
              Стоимость и сроки доставки уточнит менеджер при подтверждении заказа
            </p>
          {:else}
            <p class="hint">Забрать можно в офлайн-магазине: Казань, ул. Чистопольская, 66</p>
          {/if}
        </section>

        <section class="block">
          <div class="block__head">
            <h2>Оплата</h2>
          </div>
          <div class="payment-opts">
            {#each [
              { v: 'now', label: 'Оплата сразу' },
              { v: '6', label: 'Рассрочка 6 месяцев — 0%' },
              { v: '12', label: 'Рассрочка 12 месяцев — 0%' }
            ] as opt (opt.v)}
              <label class="payment-opt" class:active={payment === opt.v}>
                <input type="radio" bind:group={payment} value={opt.v} />
                {opt.label}
              </label>
            {/each}
          </div>
        </section>

        <section class="block">
          <div class="block__head">
            <h2>Комментарий к заказу</h2>
          </div>
          <textarea
            class="input primary comment"
            placeholder="Например, особенности подъезда к дому"
            bind:value={comment}
          ></textarea>
        </section>
      </div>

      <div class="sidebar">
        <div class="sidebar-card checkout">
          {#if hasBonusWriteOff}
            <div class="bonus-card">
              <div class="bonus-card__head">
                <BonusIcon />
                <span>Бонусы применены</span>
              </div>
              <p class="bonus-card__sum">Списано {formatPrice(bonusWriteOff)} ₽</p>
            </div>
          {/if}
          <div class="rows">
            <div class="row">
              <span>Товары ({itemsCount}):</span>
              <b>{formatPrice(total)} ₽</b>
            </div>
            {#if hasBonusWriteOff}
              <div class="row row--bonus">
                <span>Списание бонусов:</span>
                <b>−{formatPrice(bonusWriteOff)} ₽</b>
              </div>
            {/if}
            <div class="row row--result">
              <span>Товары после бонусов:</span>
              <b>{formatPrice(payable)} ₽</b>
            </div>
            <div class="row">
              <span>{method === 'delivery' ? 'Доставка' : 'Самовывоз'}:</span>
              <b class="row__free">бесплатно</b>
            </div>
          </div>
          <label class="agree">
            <input type="checkbox" bind:checked={agreed} />
            <span>
              Согласен на обработку
              <a href="/privacy" target="_blank" rel="noopener">персональных данных</a>
            </span>
          </label>
          <div class="actions">
            <button class="btn primary" onclick={submit}>Отправить заказ</button>
            <p class="help">
              <Phone size={14} strokeWidth={2.2} />
              Нужна помощь? <a href="tel:{SITE_PHONE_HREF}">{SITE_PHONE}</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style lang="scss">
  .cart-page {
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: $sp-8 $sp-4;
      border: 1px solid #e9ece8;
      border-radius: 16px;
      background: linear-gradient(180deg, #fff 0%, #f8faf8 100%);
      text-align: center;
      h2 {
        margin: 0 0 $sp-3;
        font-size: 2.625rem;
        line-height: 1;
        font-weight: 700;
        letter-spacing: -0.04em;
      }
      p {
        max-width: 420px;
        margin: 0 0 $sp-6;
        color: #667085;
        font-size: 1rem;
        line-height: 1.5;
      }
      .btn {
        min-width: 220px;
        height: 52px;
        border-radius: 16px;
        font-size: 0.9375rem;
        font-weight: 700;
      }
    }
    .subtitle {
      margin: 0 0 $sp-4;
      color: #667085;
      font-size: 0.9375rem;
    }
    .cart {
      grid-template-columns: minmax(0, 1fr) 340px;
      align-items: start;
    }
    .main-col {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .block {
      display: flex;
      flex-direction: column;
      gap: $sp-3;
      padding: $sp-4;
      border: 1px solid #eee;
      border-radius: 12px;
      background: #fff;

      &__head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: $sp-2;

        h2 {
          margin: 0;
          font-size: 0.9375rem;
          font-weight: 700;
          color: #111827;
        }
      }

      &__link {
        color: $green;
        font-size: 0.8125rem;
        font-weight: 600;
        text-decoration: none;
        &:hover {
          text-decoration: underline;
        }
      }
    }
    .fields {
      display: flex;
      flex-direction: column;
      gap: $sp-2;
    }
    .fields-row {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: $sp-2;
    }
    .comment {
      min-height: 84px;
      resize: vertical;
    }
    .hint {
      margin: 0;
      color: #9ca3af;
      font-size: 0.8125rem;
      line-height: 1.4;
    }
    .order-items {
      display: flex;
      flex-direction: column;
      gap: $sp-2;
    }
    .item {
      display: grid;
      grid-template-columns: 64px minmax(0, 1fr) auto;
      align-items: center;
      gap: $sp-3;
      padding: $sp-2;
      border: 1px solid #f1f1f1;
      border-radius: 8px;
      background: #fafafa;
    }
    .image-link {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 64px;
      height: 64px;
      img {
        width: 64px;
        height: 64px;
        object-fit: contain;
      }
    }
    .info {
      min-width: 0;
    }
    .name {
      display: inline-block;
      font-size: 0.8125rem;
      font-weight: 600;
      line-height: 1.3;
      color: inherit;
      text-decoration: none;
      &:hover {
        color: $green;
      }
    }
    .sub {
      margin: 2px 0 0;
      color: #9ca3af;
      font-size: 12px;
      line-height: 1.3;
    }
    .sum {
      margin: 0;
      font-size: 0.875rem;
      font-weight: 700;
      white-space: nowrap;
    }
    .payment-opts {
      display: flex;
      flex-wrap: wrap;
      gap: $sp-2;
    }
    .payment-opt {
      display: inline-flex;
      align-items: center;
      gap: $sp-2;
      padding: 0 $sp-3;
      height: 42px;
      border: 1.5px solid #e5e7eb;
      border-radius: 8px;
      font-size: 0.8125rem;
      font-weight: 600;
      color: #374151;
      cursor: pointer;
      transition: border-color 0.15s ease, color 0.15s ease;
      input {
        accent-color: $green;
      }
      &.active {
        border-color: $green;
        color: #14532d;
        background: rgba($green, 0.05);
      }
    }
    .sidebar {
      position: sticky;
      top: 84px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .sidebar-card {
      display: flex;
      flex-direction: column;
      gap: $sp-3;
      padding: $sp-4;
      border: 1px solid #eee;
      border-radius: 12px;
      background: #fff;
    }
    .bonus-card {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: $sp-3;
      border: 1px solid #f0dfa8;
      border-radius: 12px;
      background: #fef9e7;
      &__head {
        display: flex;
        align-items: center;
        gap: 6px;
        color: #a16207;
        font-size: 0.8125rem;
        font-weight: 700;
        :global(svg.bonus-icon) {
          color: #e6a73c;
        }
      }
      &__sum {
        margin: 0;
        color: #111827;
        font-size: 0.875rem;
        font-weight: 700;
      }
    }
    .rows {
      display: flex;
      flex-direction: column;
      gap: $sp-2;
    }
    .row {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: $sp-2;
      font-size: 0.8125rem;
      color: #374151;
      b {
        font-size: 0.9375rem;
        color: #111827;
        white-space: nowrap;
      }
      &--bonus b {
        color: #a16207;
      }
      &--result {
        padding-top: 8px;
        border-top: 1px solid #f1f1f1;
        font-size: 0.9375rem;
        font-weight: 700;
        color: #111827;
        b {
          font-size: 17px;
        }
      }
      &__free {
        color: $green;
        font-size: 0.8125rem;
      }
    }
    .agree {
      display: flex;
      align-items: flex-start;
      gap: $sp-2;
      font-size: 0.8125rem;
      line-height: 1.45;
      color: #667085;
      cursor: pointer;
      input {
        margin-top: 2px;
        accent-color: $green;
      }
      a {
        color: $green;
      }
    }
    .checkout {
      .actions {
        display: flex;
        flex-direction: column;
        gap: $sp-2;
        .btn {
          justify-content: center;
        }
        .help {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin: 0;
          color: #9ca3af;
          font-size: 0.8125rem;
          a {
            color: #374151;
            font-weight: 600;
            text-decoration: none;
            &:hover {
              color: $green;
            }
          }
        }
      }
    }
  }
  @media (max-width: 1023px) {
    .cart-page {
      .empty-state {
        padding: 24px 16px;
        border-radius: 22px;
        h2 {
          font-size: 32px;
        }
        p {
          font-size: 0.9375rem;
        }
      }
      .sidebar {
        position: static;
      }
      /* align-items:start от грида сплющивал сайдбар во flex-колонке */
      .cart {
        align-items: stretch;
      }
      .fields-row {
        grid-template-columns: 1fr;
      }
    }
  }
</style>
