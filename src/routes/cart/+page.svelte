<script lang="ts">
  import type { PageData } from './$types';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { cart } from '$lib/stores/cart';
  import { formatPrice } from '$lib/utils/formatPrice';
  import { applyCartDiscount, isDiscountExcludedBrand } from '$lib/utils/pricing';
  import { apiFetch } from '$lib/api';
  import { toast } from 'svelte-sonner';
  import Modal from '$lib/components/Modal.svelte';
  import CartPdfExport from '$lib/components/CartPdfExport.svelte';
  import { Menu, Minus, Plus, Trash, BadgePercent, ArrowRight, Truck, CreditCard, Wallet, Banknote, QrCode, Smartphone, ChevronDown } from 'lucide-svelte';
  import { phoneMask } from '$lib/actions/phoneMask';
  import { getPhoneLocalDigits, isValidRuPhone, normalizeRuPhone } from '$lib/utils/phone';
  import cartEmptyImage from '$lib/assets/cart-empty.webp';
  import { openOtp } from '$lib/utils/otp';
  let { data } = $props<{ data: PageData }>();
  let nameInput: HTMLInputElement;
  let phoneInput: HTMLInputElement;
  let name = data.user?.full_name ?? '';
  let phone = getPhoneLocalDigits(data.user?.phone);
  const cartDiscountPercent = data.cartDiscountPercent ?? 0;
  const excludedBrands = data.excludedBrands ?? [];
  let showModal = false;
  const reachGoal = (goal: string) => {
    if (typeof window === 'undefined') return;
    window.ym?.(108518016, 'reachGoal', goal);
  };
  function focusField(el: HTMLInputElement) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.focus();
  }
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
    const items = $cart.map((i) => ({
      id: i.id,
      name: i.name,
      price: i.price,
      oldPrice: i.oldPrice ?? null,
      qty: i.qty,
      slug: i.slug ?? null
    }));
    try {
      await apiFetch(fetch, '/api/orders', {
        method: 'POST',
        body: JSON.stringify({ name, phone: normalizeRuPhone(phone), items }),
        headers: { 'Content-Type': 'application/json' }
      });
      reachGoal('cart_submit');
      cart.clear();
      if (data.user) {
        toast.success('Заказ создан');
        await goto('/user/orders');
        return;
      }
      showModal = true;
      name = '';
      phone = '';
    } catch {
      toast.error('Ошибка при оформлении заказа');
    }
  };
  // Скидка применяется только к товарам, чей бренд не в списке исключений (защищённый ассортимент)
  const itemDiscountedPrice = (i: { price: number; qty: number; brand?: string | null; protected?: boolean }) =>
    isDiscountExcludedBrand(i.brand, i.protected, excludedBrands) ? i.price : applyCartDiscount(i.price, cartDiscountPercent);
  const total = $derived($cart.reduce((sum, i) => sum + i.price * i.qty, 0));
  const totalWithDiscount = $derived($cart.reduce((sum, i) => sum + itemDiscountedPrice(i) * i.qty, 0));
  const savings = $derived(total - totalWithDiscount);
  const hasDiscount = $derived(savings > 0);
  const closeModal = () => (showModal = false);
  let openAccordion = $state<string | null>('installment');
  const toggleAccordion = (id: string) => {
    openAccordion = openAccordion === id ? null : id;
  };
  onMount(() => {
    cart.sync();
  });
</script>

<div class="cart-page">
  {#if $cart.length === 0}
    <div class="empty-state mb-4">
      <img src={cartEmptyImage} alt="Пустая корзина" />
      <h2>Корзина пуста</h2>
      <p>Добавьте товары в корзину и оформите заказ</p>
      <a class="btn primary gap-3" href="/catalog"><Menu size={18} />Перейти в каталог</a>
    </div>
  {:else}
    <h1 class="pt-3 pb-1">Корзина</h1>
    <div class="cart mb-3 flex flex-col gap-3 lg:mb-4 lg:grid lg:gap-5">
      <div class="items">
        {#each $cart as item}
          <div class="item">
            <div class="item-main">
              <a
                class="image-link"
                href={item.slug ? `/products/${item.slug}` : undefined}
                aria-label={item.name}
              >
                <img src={item.image ?? '/images/no_image.png'} alt={item.name} />
              </a>
              <div class="info">
                <a class="name" href={item.slug ? `/products/${item.slug}` : undefined}>
                  {item.name}
                </a>
                {#if item.description}
                  <p class="description">{item.description}</p>
                {/if}
              </div>
            </div>
            <div class="item-actions">
              <div class="qty">
                <button onclick={() => cart.dec(item.id)}
                  ><Minus size="14" strokeWidth="2.5" /></button
                >
                <span>{item.qty}</span>
                <button onclick={() => cart.inc(item.id)}
                  ><Plus size="14" strokeWidth="2.5" /></button
                >
              </div>
              <div class="sum-wrap">
                {#if !isDiscountExcludedBrand(item.brand, item.protected, excludedBrands)}
                  <p class="old-sum">{formatPrice(item.price * item.qty)} ₽</p>
                  <p class="discount-sum sum">
                    {formatPrice(itemDiscountedPrice(item) * item.qty)} ₽
                  </p>
                {:else}
                  <p class="sum">{formatPrice(item.price * item.qty)} ₽</p>
                {/if}
              </div>
              <button class="remove" onclick={() => cart.remove(item.id)}
                ><Trash size="14" strokeWidth="2.5" /></button
              >
            </div>
          </div>
        {/each}
        {#if hasDiscount}
          <div class="cart-promo">
            <div class="cart-promo__badge">
              <BadgePercent size={16} strokeWidth={2.4} />
              <span>Скидка {cartDiscountPercent}%</span>
            </div>
            <div class="cart-promo__title">Оформи заказ сейчас</div>
            <div class="cart-promo__prices">
              <span class="old-sum">{formatPrice(total)} ₽</span>
              <ArrowRight size={18} strokeWidth={2.5} />
              <span class="cart-promo__new">{formatPrice(totalWithDiscount)} ₽</span>
            </div>
            <div class="cart-promo__save-row">
              <span class="cart-promo__save">Ваша выгода</span>
              <span class="cart-promo__save-value">{formatPrice(savings)} ₽</span>
            </div>
            <button class="btn primary cart-promo__btn" onclick={submit}>
              Оформить заказ
              <ArrowRight size={18} strokeWidth={2.5} />
            </button>
          </div>
        {/if}
      </div>
      <div class="sidebar">
        <div class="sidebar-card checkout">
          <div class="sidebar-card__head-static">
            <span class="sidebar-card__icon"><BadgePercent size={18} strokeWidth={2.2} /></span>
            <span class="sidebar-card__title">Оформление</span>
          </div>
          <div class="total">
            <span>Итого:</span>
            <div class="total-prices">
              <span class="old-sum">{formatPrice(total)} ₽</span>
              <b class="discount-sum">{formatPrice(totalWithDiscount)} ₽</b>
            </div>
          </div>
          <input class="input primary" placeholder="Ваше имя" bind:value={name} bind:this={nameInput} />
          <div class="with-prefix">
            <span class="prefix">+7</span>
            <input
              class="input primary"
              placeholder="999 123 45 67"
              autocomplete="tel"
              inputmode="numeric"
              value={phone}
              bind:this={phoneInput}
              use:phoneMask={{ value: phone, onAccept: (digits) => (phone = digits) }}
            />
          </div>
          <div class="actions">
            <button class="btn primary" onclick={submit}>Узнать больше</button>
          </div>
        </div>

        <div class="sidebar-card accordion">
          <button class="sidebar-card__head" onclick={() => toggleAccordion('delivery')}>
            <span class="sidebar-card__head-left">
              <span class="sidebar-card__icon"><Truck size={18} strokeWidth={2.2} /></span>
              <span class="sidebar-card__title">Доставка</span>
            </span>
            <ChevronDown size={18} strokeWidth={2.2} class={'chevron' + (openAccordion === 'delivery' ? ' chevron--open' : '')} />
          </button>
          {#if openAccordion === 'delivery'}
            <div class="accordion-body">
              <p class="sidebar-card__text">Бесплатная доставка по Казани и РТ. После оформления заказа менеджер свяжется с вами и согласует удобное время.</p>
            </div>
          {/if}
        </div>

        <div class="sidebar-card accordion">
          <button class="sidebar-card__head" onclick={() => toggleAccordion('payment')}>
            <span class="sidebar-card__head-left">
              <span class="sidebar-card__icon"><Wallet size={18} strokeWidth={2.2} /></span>
              <span class="sidebar-card__title">Оплата</span>
            </span>
            <ChevronDown size={18} strokeWidth={2.2} class={'chevron' + (openAccordion === 'payment' ? ' chevron--open' : '')} />
          </button>
          {#if openAccordion === 'payment'}
            <div class="accordion-body">
              <div class="payment-icons">
                <div class="payment-icon" title="Оплата по QR"><QrCode size={22} strokeWidth={1.8} /></div>
                <div class="payment-icon" title="Терминал"><Smartphone size={22} strokeWidth={1.8} /></div>
                <div class="payment-icon" title="Картой"><CreditCard size={22} strokeWidth={1.8} /></div>
                <div class="payment-icon" title="Наличные"><Banknote size={22} strokeWidth={1.8} /></div>
              </div>
            </div>
          {/if}
        </div>

        <div class="sidebar-card accordion">
          <button class="sidebar-card__head" onclick={() => toggleAccordion('installment')}>
            <span class="sidebar-card__head-left">
              <span class="sidebar-card__icon"><BadgePercent size={18} strokeWidth={2.2} /></span>
              <span class="sidebar-card__title">Рассрочка 0-0-12</span>
            </span>
            <ChevronDown size={18} strokeWidth={2.2} class={'chevron' + (openAccordion === 'installment' ? ' chevron--open' : '')} />
          </button>
          {#if openAccordion === 'installment'}
            <div class="accordion-body">
              <p class="sidebar-card__text">Без переплат и скрытых комиссий на 12 месяцев. Техника сразу, первый платёж через месяц.</p>
              <button
                class="btn secondary mt-2"
                onclick={(e) => { e.stopPropagation();
                  openOtp({
                    cart: $cart.map((i) => ({
                      name: i.name,
                      price: i.price,
                      quantity: i.qty
                    }))
                  }); }}>Оформить заявку</button
              >
            </div>
          {/if}
        </div>

        <CartPdfExport {total} />

        <button class="clear-cart" onclick={() => cart.clear()}>
          <Trash size={15} strokeWidth={2.4} />
          Очистить корзину
        </button>
      </div>
    </div>
  {/if}
</div>

<Modal
  open={showModal}
  text="Мы получили ваш заказ! Скоро свяжемся с вами, чтобы уточнить детали."
  onClose={closeModal}
/>

<style lang="scss">
  .cart-page {
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 36px 20px 30px;
      border: 1px solid #e9ece8;
      border-radius: 16px;
      background: linear-gradient(180deg, #fff 0%, #f8faf8 100%);
      text-align: center;
      img {
        width: min(100%, 560px);
        margin-bottom: 8px;
        object-fit: contain;
      }
      h2 {
        margin: 0 0 10px;
        font-size: 42px;
        line-height: 1;
        font-weight: 800;
        letter-spacing: -0.04em;
      }
      p {
        max-width: 420px;
        margin: 0 0 24px;
        color: #667085;
        font-size: 17px;
        line-height: 1.5;
      }
      .btn {
        min-width: 220px;
        height: 52px;
        border-radius: 16px;
        font-size: 15px;
        font-weight: 700;
      }
    }
    .old-sum {
      color: #111;
      font-size: 13px;
      font-weight: 500;
      line-height: 1;
      text-decoration: line-through;
      text-decoration-color: #e31b23;
      text-decoration-thickness: 1.5px;
      opacity: 0.62;
      white-space: nowrap;
    }
    .discount-sum {
      color: #e31b23;
    }
    .cart {
      grid-template-columns: 1fr 320px;
      .items {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .item {
        display: grid;
        grid-template-columns: 1fr auto;
        align-items: center;
        gap: 16px;
        padding: 12px 14px;
        border: 1px solid #eee;
        border-radius: 12px;
        background: #fff;
      }
      .item-main {
        display: grid;
        grid-template-columns: 86px minmax(0, 1fr);
        align-items: center;
        gap: 16px;
        min-width: 0;
      }
      .image-link {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 86px;
        height: 96px;
        img {
          width: 86px;
          height: 96px;
          object-fit: contain;
        }
      }
      .info {
        min-width: 0;
      }
      .name {
        display: inline-block;
        font-size: 14px;
        font-weight: 600;
        line-height: 1.25;
        color: inherit;
        text-decoration: none;
        &:hover {
          color: $green;
        }
      }
      .description {
        margin-top: 5px;
        color: #777;
        font-size: 13px;
        line-height: 1.35;
      }
      .item-actions {
        display: grid;
        grid-template-columns: 110px 110px 42px;
        align-items: center;
        gap: 14px;
      }
      .qty {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 6px;
          background: #f3f3f3;
          text-align: center;
          &:hover {
            background: #e6e4e4;
            opacity: 0.9;
          }
        }
      }
      .sum-wrap {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 2px;
        min-width: 0;
      }
      .sum {
        font-size: 16px;
        font-weight: 700;
        white-space: nowrap;
        text-align: right;
      }
      .remove {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 33px;
        height: 33px;
        border: 1px solid rgba(255, 0, 0, 0.25);
        border-radius: 12px;
        color: rgba(255, 0, 0, 0.5);
        &:hover {
          border: 1px solid rgba(255, 0, 0, 0.5);
          background: rgba(255, 0, 0, 0.05);
        }
      }
    }
    .clear-cart {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      height: 44px;
      border: 1.5px solid rgba(255, 0, 0, 0.25);
      border-radius: 12px;
      background: #fff;
      color: rgba(255, 0, 0, 0.7);
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      transition: 0.15s ease;
      &:hover {
        border-color: rgba(255, 0, 0, 0.5);
        background: rgba(255, 0, 0, 0.05);
        color: #e31b23;
      }
    }
    .sidebar {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .sidebar-card {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 16px;
      border: 1px solid #eee;
      border-radius: 12px;
      background: #fff;
    }
    .sidebar-card__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      width: 100%;
      padding: 0;
      border: none;
      background: transparent;
      cursor: pointer;
      font: inherit;
      text-align: left;
    }
    .sidebar-card__head-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .accordion-body {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    :global(.chevron) {
      color: #94a3b8;
      transition: transform 0.2s ease;
      flex-shrink: 0;
    }
    :global(.chevron--open) {
      transform: rotate(180deg);
    }
    .sidebar-card__head-static {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .sidebar-card__icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: rgba($green, 0.08);
      color: $green;
      flex-shrink: 0;
    }
    .sidebar-card__title {
      font-size: 15px;
      font-weight: 800;
      color: #111827;
    }
    .sidebar-card__text {
      margin: 0;
      font-size: 13.5px;
      line-height: 1.45;
      color: #667085;
    }
    .payment-icons {
      display: flex;
      gap: 8px;
    }
    .payment-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 42px;
      height: 42px;
      border-radius: 10px;
      background: #f8f9fa;
      color: #64748b;
    }
    .checkout {
      .total {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 18px;
        .total-prices {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
          b {
            font-size: 20px;
          }
        }
      }
      .actions {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
    }
    .cart-promo {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 20px;
      border-radius: 14px;
      border: 2px solid rgba($green, 0.4);
      background: linear-gradient(135deg, rgba($green, 0.1), rgba($green, 0.03));
      box-shadow: 0 4px 16px rgba($green, 0.08);
    }
    .cart-promo__badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      align-self: flex-start;
      padding: 4px 10px;
      border-radius: 8px;
      background: $green;
      color: #fff;
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .cart-promo__title {
      font-size: 18px;
      font-weight: 800;
      color: #111827;
      line-height: 1.2;
    }
    .cart-promo__prices {
      display: flex;
      align-items: center;
      gap: 10px;
      color: #999;
      .old-sum,
      .cart-promo__new {
        white-space: nowrap;
      }
      .cart-promo__new {
        font-size: 28px;
        font-weight: 800;
        color: #e31b23;
        line-height: 1;
        letter-spacing: -0.02em;
      }
    }
    .cart-promo__save-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      border-radius: 8px;
      background: rgba($green, 0.08);
    }
    .cart-promo__save {
      font-size: 13px;
      font-weight: 600;
      color: #475569;
    }
    .cart-promo__save-value {
      font-size: 15px;
      font-weight: 800;
      color: $green;
    }
    .cart-promo__btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      height: 48px;
      font-size: 15px;
      font-weight: 700;
      border-radius: 12px;
    }
  }
  @media (max-width: 1023px) {
    .cart-page {
      .empty-state {
        padding: 24px 16px;
        border-radius: 22px;
        img {
          width: 100%;
          max-width: 360px;
        }
        h2 {
          font-size: 32px;
        }
        p {
          font-size: 15px;
        }
      }
      .cart {
        .item {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 12px;
          padding: 12px;
        }
        .item-main {
          grid-template-columns: 90px minmax(0, 1fr);
          align-items: flex-start;
          gap: 12px;
        }
        .image-link {
          width: 90px;
          height: 118px;
          flex-shrink: 0;
          img {
            width: 90px;
            height: 118px;
            object-fit: contain;
          }
        }
        .name {
          font-size: 14px;
        }
        .description {
          margin-top: 4px;
          font-size: 12.5px;
          line-height: 1.35;
        }
        .item-actions {
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 10px;
          padding-top: 10px;
          border-top: 1px solid #f1f1f1;
        }
        .qty {
          justify-content: flex-start;
        }
        .sum-wrap {
          align-items: center;
        }
        .sum {
          font-size: 15px;
          text-align: center;
        }
        .remove {
          width: 34px;
          height: 34px;
        }
      }
      .cart-promo {
        grid-template-columns: 1fr;
      }
      .cart-promo__img {
        min-height: 180px;
        max-height: 220px;
      }
      .cart-promo__body {
        padding: 18px;
      }
      .cart-promo__head {
        font-size: 15px;
      }
      .cart-promo__prices .cart-promo__new {
        font-size: 26px;
      }
      .cart-promo__btn {
        width: 100%;
        justify-content: center;
      }
    }
  }
</style>
