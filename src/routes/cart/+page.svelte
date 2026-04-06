<script lang="ts">
  import { cart } from '$lib/stores/cart';
  import { formatPrice } from '$lib/utils/formatPrice';
  import { apiFetch } from '$lib/api';
  import { toast } from 'svelte-sonner';

  let name = '';
  let phone = '';
  let showModal = false;

  const submit = async () => {
    if (!phone) {
      toast.error('Введите телефон');
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
        body: JSON.stringify({ name, phone, items }),
        headers: { 'Content-Type': 'application/json' }
      });

      showModal = true;
      cart.clear();
      name = '';
      phone = '';
    } catch {
      toast.error('Ошибка при оформлении заказа');
    }
  };

  const total = () => $cart.reduce((sum, i) => sum + i.price * i.qty, 0);
</script>

<div class="cart-page">
  <h1>Корзина</h1>

  {#if $cart.length === 0}
    <p class="empty">Корзина пуста</p>
  {:else}
    <div class="cart">
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

            <div class="sum">
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

        <input placeholder="Ваше имя" bind:value={name} />
        <input placeholder="Телефон" bind:value={phone} />
        <button class="submit" on:click={submit}> Перейти к оплате </button>
      </div>
    </div>
  {/if}
</div>

{#if showModal}
  <div class="modal-overlay" on:click={() => (showModal = false)}>
    <div class="modal" on:click|stopPropagation>
      <p>Менеджер свяжется с вами в ближайшее время</p>
      <button on:click={() => (showModal = false)}>Понятно</button>
    </div>
  </div>
{/if}

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
  }
  .cart {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 30px;
  }
  .items {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .item {
    display: grid;
    grid-template-columns: 80px 1fr 120px 120px 40px;
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
    }
    .remove {
      color: red;
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
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  .modal {
    background: #fff;
    padding: 20px;
    border-radius: 12px;
    width: 300px;
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 16px;
    p {
      font-size: 14px;
    }
    button {
      background: $green-light;
      color: #fff;
      height: 40px;
      border-radius: 8px;
    }
  }
</style>
