<script lang="ts">
  import { cart } from '$lib/stores/cart';
  import { formatPrice } from '$lib/utils/formatPrice';
  import { apiFetch } from '$lib/api';
  import { toast } from 'svelte-sonner';
  import IMask from 'imask';
  import Modal from '$lib/components/Modal.svelte';
  import { Minus, Plus, Trash } from 'lucide-svelte';

  let name = '';
  let showModal = false;
  let phoneInput: HTMLInputElement;
  let mask: ReturnType<typeof IMask>;
  let total = 0;

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

  $: total = $cart.reduce((sum, i) => sum + i.price * i.qty, 0);

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
                <button on:click={() => cart.dec(item.id)}>
                  <Minus size="14" strokeWidth="2.5" />
                </button>
                <span>{item.qty}</span>
                <button on:click={() => cart.inc(item.id)}>
                  <Plus size="14" strokeWidth="2.5" />
                </button>
              </div>
            </div>

            <p class="hidden text-[0.9rem] font-semibold lg:block lg:text-[1rem]!">
              {formatPrice(item.price * item.qty)} ₽
            </p>

            <button class="remove" on:click={() => cart.remove(item.id)}>
              <Trash size="14" strokeWidth="2.5" />
            </button>
          </div>
        {/each}
      </div>

      <div class="checkout">
        <div class="total">
          <span>Итого:</span>
          <b>{formatPrice(total)} ₽</b>
        </div>

        <input class="input primary" placeholder="Ваше имя" bind:value={name} />
        <input class="input primary imask-input" placeholder="Телефон" bind:this={phoneInput} />
        <button class="btn primary" on:click={submit}>Перейти к оплате</button>
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
      input {
        height: 42px;
        padding: 0 10px;
        border: 1px solid #ddd;
        border-radius: 8px;
      }
    }
  }
</style>
