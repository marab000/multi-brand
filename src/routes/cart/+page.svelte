<script lang="ts">
  import { cart } from '$lib/stores/cart';
  import { formatPrice } from '$lib/utils/formatPrice';
  import { apiFetch } from '$lib/api';
  import { toast } from 'svelte-sonner';
  import IMask from 'imask';
  import Modal from '$lib/components/Modal.svelte';

  let name = '';
  let showModal = false;
  let phoneInput: HTMLInputElement;
  let mask: ReturnType<typeof IMask>;

  const isValidPhone = () => {
    const digits = mask?.unmaskedValue || '';
    return digits.length === 10 && digits.startsWith('9');
  };

  const submit = async () => {
    if (!name.trim()) {
      toast.error('Введите имя');
      return;
    }

    if (!mask || !isValidPhone()) {
      toast.error('Введите корректный номер телефона');
      return;
    }

    const items = $cart.map((i) => ({
      id: i.id,
      name: i.name,
      price: i.price,
      qty: i.qty
    }));

    try {
      await apiFetch(fetch, '/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          name,
          phone: `+7${mask.unmaskedValue}`,
          items
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      showModal = true;
      cart.clear();
      name = '';
      mask.value = '';
    } catch {
      toast.error('Ошибка при оформлении заказа');
    }
  };

  const total = () => $cart.reduce((sum, i) => sum + i.price * i.qty, 0);

  $: if (phoneInput && !mask) {
    mask = IMask(phoneInput, {
      mask: '+7 000 000 00 00',
      lazy: false,
      placeholderChar: ' '
    });
  }

  const closeModal = () => (showModal = false);
</script>

<div class="cart-page">
  <h1>Корзина</h1>

  {#if $cart.length === 0}
    <p class="empty">Корзина пуста</p>
  {:else}
    <div class="cart flex flex-col lg:grid">
      <div class="items">
        {#each $cart as item}
          <div class="item">
            <img src={item.image ?? '/images/no_image.png'} alt={item.name} />
            <div class="info">
              <h3>{item.name}</h3>
              <p>{formatPrice(item.price)} ₽</p>
            </div>
            <div class="qty">
              <button on:click={() => cart.dec(item.id)}>-</button>
              <span>{item.qty}</span>
              <button on:click={() => cart.inc(item.id)}>+</button>
            </div>
            <div class="sum text-[0.9rem] lg:text-[1rem]">
              {formatPrice(item.price * item.qty)} ₽
            </div>
            <button class="remove" on:click={() => cart.remove(item.id)}> ✕ </button>
          </div>
        {/each}
      </div>

      <div class="checkout">
        <div class="total">
          <span>Итого:</span>
          <b>{formatPrice(total())} ₽</b>
        </div>

        <input class="input primary" placeholder="Ваше имя" bind:value={name} />
        <input class="input primary imask-input" placeholder="Телефон" bind:this={phoneInput} />
        <button class="submit" on:click={submit}>Перейти к оплате</button>
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
      font-size: 28px;
      font-weight: 600;
      margin-bottom: 20px;
    }
    .empty {
      color: #777;
    }
    .cart {
      grid-template-columns: 1fr 320px;
      gap: 30px;
      .items {
        display: flex;
        flex-direction: column;
        gap: 12px;
        .item {
          display: grid;
          grid-template-columns:
            minmax(50px, 80px) minmax(100px, 1fr) minmax(70px, 100px) minmax(70px, 100px)
            minmax(20px, 40px);
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: #fff;
          border-radius: 12px;
          border: 1px solid #eee;
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
            display: flex;
            align-items: center;
            gap: 8px;
            button {
              width: 28px;
              height: 28px;
              border-radius: 6px;
              background: #f3f3f3;
              &:hover {
                opacity: 0.9;
              }
            }
          }
          .sum {
            font-weight: 600;
            font-size: 0.9rem;
          }
          .remove {
            color: red;
          }
        }
      }
    }
    .checkout {
      background: #fff;
      border-radius: 12px;
      padding: 16px;
      border: 1px solid #eee;
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: auto;
      .total {
        display: flex;
        justify-content: space-between;
        font-size: 18px;
      }
      input {
        height: 42px;
        border-radius: 8px;
        border: 1px solid #ddd;
        padding: 0 10px;
      }
      .submit {
        background: $green-light;
        color: white;
        height: 44px;
        border-radius: 10px;
      }
    }
  }
</style>
