<script lang="ts">
  import { Minus, Plus, ShoppingCart } from 'lucide-svelte';
  import { cart, type CartItem } from '$lib/stores/cart';

  // Единая кнопка «В корзину» для всего сайта (карточка каталога, страница
  // товара, избранное). Если товар уже в корзине — показывает счётчик −qty+.
  let {
    item,
    // true внутри карточки-ссылки: клик не должен вести на товар
    stopPropagation = false
  }: { item: Omit<CartItem, 'qty'>; stopPropagation?: boolean } = $props();

  const qty = $derived($cart.find((i) => i.id === item.id)?.qty ?? 0);

  function add(e: MouseEvent) {
    if (stopPropagation) {
      e.preventDefault();
      e.stopPropagation();
    }
    cart.add(item);
  }
</script>

{#if qty > 0}
  <div class="cart-counter">
    <button type="button" aria-label="Уменьшить количество" onclick={() => cart.dec(item.id)}>
      <Minus size={16} strokeWidth={2.6} />
    </button>
    <span>{qty}</span>
    <button type="button" aria-label="Увеличить количество" onclick={() => cart.inc(item.id)}>
      <Plus size={16} strokeWidth={2.6} />
    </button>
  </div>
{:else}
  <button class="btn outline cart-btn" type="button" aria-label="Добавить в корзину" onclick={add}>
    <ShoppingCart size={16} strokeWidth={2.2} />
    В корзину
  </button>
{/if}

<style lang="scss">
  /* переменные $green/$sp-* приходят глобально (svelte.config prependData) */
  .cart-btn {
    height: 34px;
    padding: 0 8px;
    border-radius: 8px;
    font-size: 0.8125rem;
    font-weight: 600;
    flex-shrink: 0;
  }
</style>
