<script lang="ts">
  import type { PageData } from './$types';
  import { goto } from '$app/navigation';
  import { cart } from '$lib/stores/cart';
  import { formatPrice } from '$lib/utils/formatPrice';
  import { apiFetch } from '$lib/api';
  import { toast } from 'svelte-sonner';
  import Modal from '$lib/components/Modal.svelte';
  import CartPdfExport from '$lib/components/CartPdfExport.svelte';
  import { Minus, Plus, Trash } from 'lucide-svelte';
  import { phoneMask } from '$lib/actions/phoneMask';
  import { getPhoneLocalDigits, isValidRuPhone, normalizeRuPhone } from '$lib/utils/phone';

  export let data: PageData;

  let name = data.user?.full_name ?? '';
  let phone = getPhoneLocalDigits(data.user?.phone);
  let showModal = false;
  let total = 0;

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
  <h1>Корзина</h1>
  {#if $cart.length === 0}
    <p class="empty">Корзина пуста</p>
  {:else}
    <div class="cart flex flex-col gap-3 lg:grid lg:gap-5">
      <div class="items">
        {#each $cart as item}
          <div class="item flex! justify-around lg:grid!">
            <img src={item.image ?? '/images/no_image.png'} alt={item.name} />
            <div class="info">
              <h3>{item.name}</h3>
              <p>{formatPrice(item.price)} ₽</p>
            </div>
            <div class="qty flex flex-col gap-3">
              <p class="block text-center font-semibold lg:hidden">
                {formatPrice(item.price * item.qty)} ₽
              </p>
              <div class="flex items-center gap-2">
                <button on:click={() => cart.dec(item.id)}
                  ><Minus size="14" strokeWidth="2.5" /></button
                >
                <span>{item.qty}</span>
                <button on:click={() => cart.inc(item.id)}
                  ><Plus size="14" strokeWidth="2.5" /></button
                >
              </div>
            </div>
            <p class="hidden text-[0.9rem] font-semibold lg:block lg:text-[1rem]!">
              {formatPrice(item.price * item.qty)} ₽
            </p>
            <button class="remove" on:click={() => cart.remove(item.id)}
              ><Trash size="14" strokeWidth="2.5" /></button
            >
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
    h1 {
      margin-bottom: 20px;
      font-size: 28px;
      font-weight: 600;
    }
    .empty {
      color: #777;
    }
    .cart {
      grid-template-columns: 1fr 320px;
      .items {
        display: flex;
        flex-direction: column;
        gap: 12px;
        .item {
          display: grid;
          grid-template-columns: minmax(50px, 80px) minmax(100px, 1fr) minmax(70px, 100px) minmax(
              70px,
              100px
            ) minmax(20px, 40px);
          align-items: center;
          gap: 12px;
          padding: 12px;
          border: 1px solid #eee;
          border-radius: 12px;
          background: #fff;
          img {
            width: 80px;
            height: 80px;
            object-fit: contain;
          }
          .info {
            h3 {
              font-size: 14px;
              font-weight: 600;
            }
            p {
              font-size: 13px;
              color: #777;
            }
          }
          .qty {
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
</style>
