<script lang="ts">
  import type { PageData } from './$types';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { cart } from '$lib/stores/cart';
  import { formatPrice } from '$lib/utils/formatPrice';
  import { applyCartDiscount, CART_DISCOUNT_PERCENT, isDiscountExcludedBrand } from '$lib/utils/pricing';
  import { apiFetch } from '$lib/api';
  import { toast } from 'svelte-sonner';
  import Modal from '$lib/components/Modal.svelte';
  import CartPdfExport from '$lib/components/CartPdfExport.svelte';
  import { Menu, Minus, Plus, Trash, BadgePercent, ArrowRight } from 'lucide-svelte';
  import { phoneMask } from '$lib/actions/phoneMask';
  import { getPhoneLocalDigits, isValidRuPhone, normalizeRuPhone } from '$lib/utils/phone';
  import cartEmptyImage from '$lib/assets/cart-empty.webp';
  import cartSaleImage from '$lib/assets/cart-sale.webp';
  import { openOtp } from '$lib/utils/otp';
  export let data: PageData;
  let nameInput: HTMLInputElement;
  let phoneInput: HTMLInputElement;
  let name = data.user?.full_name ?? '';
  let phone = getPhoneLocalDigits(data.user?.phone);
  let showModal = false;
  let total = 0;
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
    isDiscountExcludedBrand(i.brand, i.protected) ? i.price : applyCartDiscount(i.price);
  $: total = $cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  $: totalWithDiscount = $cart.reduce((sum, i) => sum + itemDiscountedPrice(i) * i.qty, 0);
  $: savings = total - totalWithDiscount;
  $: hasDiscount = savings > 0;
  const closeModal = () => (showModal = false);
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
                <button on:click={() => cart.dec(item.id)}
                  ><Minus size="14" strokeWidth="2.5" /></button
                >
                <span>{item.qty}</span>
                <button on:click={() => cart.inc(item.id)}
                  ><Plus size="14" strokeWidth="2.5" /></button
                >
              </div>
              <div class="sum-wrap">
                {#if !isDiscountExcludedBrand(item.brand, item.protected)}
                  <p class="old-sum">{formatPrice(item.price * item.qty)} ₽</p>
                  <p class="discount-sum sum">
                    {formatPrice(itemDiscountedPrice(item) * item.qty)} ₽
                  </p>
                {:else}
                  <p class="sum">{formatPrice(item.price * item.qty)} ₽</p>
                {/if}
              </div>
              <button class="remove" on:click={() => cart.remove(item.id)}
                ><Trash size="14" strokeWidth="2.5" /></button
              >
            </div>
          </div>
        {/each}
        <button class="clear-cart" on:click={() => cart.clear()}>
          <Trash size={14} strokeWidth={2.5} />
          Очистить корзину
        </button>
        {#if hasDiscount}
          <div class="cart-promo">
            <img class="cart-promo__img" src={cartSaleImage} alt="Скидка на оформление заказа" />
            <div class="cart-promo__body">
              <div class="cart-promo__head">
                <BadgePercent size={20} strokeWidth={2.2} />
                <span>Скидка {CART_DISCOUNT_PERCENT}% при оформлении сейчас</span>
              </div>
              <div class="cart-promo__prices">
                <span class="old-sum">{formatPrice(total)} ₽</span>
                <ArrowRight size={18} strokeWidth={2.5} />
                <span class="cart-promo__new">{formatPrice(totalWithDiscount)} ₽</span>
              </div>
              <p class="cart-promo__save">Ваша выгода: {formatPrice(savings)} ₽</p>
              <button class="btn primary cart-promo__btn" on:click={submit}>
                Оформить заказ
                <ArrowRight size={18} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        {/if}
      </div>
      <div>
        <div class="checkout">
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
            <button class="btn primary" on:click={submit}>Узнать больше</button>
          </div>
        </div>
        <div class="installment-banner mt-3">
          <div class="text gap-4">
            <h3>Вы можете приобрести товары в рассрочку на 0-0-12 без %</h3>
            <button
              class="btn secondary"
              on:click|stopPropagation={() =>
                openOtp({
                  cart: $cart.map((i) => ({
                    name: i.name,
                    price: i.price,
                    quantity: i.qty
                  }))
                })}>Оформить заявку</button
            >
          </div>
        </div>
        <CartPdfExport {total} />
      </div>
    </div>
  {/if}
</div>

<Modal
  open={showModal}
  text="Мы получили ваш заказ! Скоро свяжемся с вами, чтобы уточнить детали."
  on:close={closeModal}
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
      display: inline-flex;
      align-items: center;
      gap: 6px;
      align-self: flex-start;
      padding: 8px 16px;
      border: 1px solid rgba(255, 0, 0, 0.2);
      border-radius: 10px;
      background: transparent;
      color: rgba(255, 0, 0, 0.6);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: 0.15s ease;
      &:hover {
        border-color: rgba(255, 0, 0, 0.4);
        background: rgba(255, 0, 0, 0.04);
        color: rgba(255, 0, 0, 0.8);
      }
    }
    .checkout {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: auto;
      padding: 16px;
      border: 1px solid #eee;
      border-radius: 12px;
      background: #fff;
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
    .installment-banner {
      padding: 16px;
      border-radius: 12px;
      border: 1px solid rgba($yellow, 0.5);
      .text {
        display: flex;
        flex-direction: column;
        h3 {
          font-size: 16px;
          font-weight: 700;
          margin: 0;
        }
      }
    }
    .cart-promo {
      display: grid;
      grid-template-columns: 7fr 3fr;
      overflow: hidden;
      border-radius: 16px;
      border: 1px solid rgba($green, 0.3);
      background: linear-gradient(135deg, rgba($green, 0.08), rgba($green, 0.02));
    }
    .cart-promo__img {
      width: 100%;
      height: 100%;
      min-height: 240px;
      object-fit: cover;
      object-position: center;
    }
    .cart-promo__body {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      justify-content: center;
      gap: 12px;
      padding: 24px 26px;
    }
    .cart-promo__head {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 17px;
      font-weight: 800;
      color: $green;
      letter-spacing: -0.01em;
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
        font-size: 30px;
        font-weight: 800;
        color: #e31b23;
        line-height: 1;
        letter-spacing: -0.02em;
      }
    }
    .cart-promo__save {
      margin: 0;
      font-size: 14px;
      font-weight: 500;
      color: #667085;
    }
    .cart-promo__btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-top: 4px;
      height: 48px;
      padding: 0 22px;
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
