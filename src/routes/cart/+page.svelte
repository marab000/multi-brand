<script lang="ts">
  import type { PageData } from './$types';
  import { goto } from '$app/navigation';
  import { cart } from '$lib/stores/cart';
  import { formatPrice } from '$lib/utils/formatPrice';
  import { apiFetch } from '$lib/api';
  import { toast } from 'svelte-sonner';
  import Modal from '$lib/components/Modal.svelte';
  import CartPdfExport from '$lib/components/CartPdfExport.svelte';
  import { Menu, Minus, Plus, Trash } from 'lucide-svelte';
  import { phoneMask } from '$lib/actions/phoneMask';
  import { getPhoneLocalDigits, isValidRuPhone, normalizeRuPhone } from '$lib/utils/phone';
  import cartEmptyImage from '$lib/assets/cart-empty.webp';
  export let data: PageData;
  let name = data.user?.full_name ?? '';
  let phone = getPhoneLocalDigits(data.user?.phone);
  let showModal = false;
  let total = 0;
  const reachGoal = (goal: string) => {
    if (typeof window === 'undefined') return;
    window.ym?.(108518016, 'reachGoal', goal);
  };
  const submit = async () => {
    if (!name.trim()) {
      toast.error('Введите имя');
      return;
    }
    if (!isValidRuPhone(phone)) {
      toast.error('Введите корректный номер телефона');
      return;
    }
    const items = $cart.map((i) => ({
      id: i.id,
      name: i.name,
      price: i.price,
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
  $: total = $cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const closeModal = () => (showModal = false);
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
                <a class="name" href={item.slug ? `/products/${item.slug}` : undefined}
                  >{item.name}</a
                >
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
              <p class="sum">{formatPrice(item.price * item.qty)} ₽</p>
              <button class="remove" on:click={() => cart.remove(item.id)}
                ><Trash size="14" strokeWidth="2.5" /></button
              >
            </div>
          </div>
        {/each}
      </div>
      <div>
        <div class="checkout">
          <div class="total">
            <span>Итого:</span>
            <b>{formatPrice(total)} ₽</b>
          </div>
          <input class="input primary" placeholder="Ваше имя" bind:value={name} />
          <div class="with-prefix">
            <span class="prefix">+7</span>
            <input
              class="input primary"
              placeholder="999 123 45 67"
              autocomplete="tel"
              inputmode="numeric"
              value={phone}
              use:phoneMask={{ value: phone, onAccept: (digits) => (phone = digits) }}
            />
          </div>
          <div class="actions">
            <button class="btn primary" on:click={submit}>Перейти к оплате</button>
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
      }
      img {
        width: 86px;
        height: 96px;
        object-fit: contain;
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
        font-size: 18px;
      }
      .actions {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
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
        }
        img {
          width: 90px;
          height: 118px;
          object-fit: contain;
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
        .sum {
          font-size: 15px;
          text-align: center;
        }
        .remove {
          width: 34px;
          height: 34px;
        }
      }
    }
  }
</style>
