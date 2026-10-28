<script lang="ts">
  import { Truck, Store } from 'lucide-svelte';
  import { deliveryMethod } from '$lib/stores/deliveryMethod';

  let method = $state<'delivery' | 'pickup'>('delivery');
  $effect(() => {
    const unsub = deliveryMethod.subscribe((v) => (method = v));
    return unsub;
  });
</script>

<div class="receive">
  <div class="receive__toggle" role="tablist">
    <button
      type="button"
      role="tab"
      aria-selected={method === 'delivery'}
      class:active={method === 'delivery'}
      onclick={() => deliveryMethod.set('delivery')}
    >
      <Truck size={16} strokeWidth={2.2} />
      Доставка
    </button>
    <button
      type="button"
      role="tab"
      aria-selected={method === 'pickup'}
      class:active={method === 'pickup'}
      onclick={() => deliveryMethod.set('pickup')}
    >
      <Store size={16} strokeWidth={2.2} />
      Самовывоз
    </button>
  </div>
  <div class="receive__info">
    {#if method === 'delivery'}
      <span class="receive__info-icon"><Truck size={18} strokeWidth={2.2} /></span>
      <div>
        <p class="receive__info-title">Доставка по Казани</p>
        <p class="receive__info-text">Бесплатно · дату и интервал согласует менеджер по телефону</p>
      </div>
    {:else}
      <span class="receive__info-icon"><Store size={18} strokeWidth={2.2} /></span>
      <div>
        <p class="receive__info-title">Самовывоз · бесплатно</p>
        <p class="receive__info-text">Казань, ул. Чистопольская, 66 — офлайн-магазин</p>
      </div>
    {/if}
  </div>
</div>

<style lang="scss">
  .receive {
    &__toggle {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: $sp-1;
      padding: $sp-1;
      border-radius: 12px;
      background: #f3f4f6;

      button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: $sp-2;
        height: 40px;
        border: 0;
        border-radius: 8px;
        background: transparent;
        color: #6b7280;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.15s ease, color 0.15s ease;

        &:hover {
          color: #111827;
        }

        &.active {
          background: $green;
          color: #fff;

          &:hover {
            color: #fff;
          }
        }
      }
    }

    &__info {
      display: flex;
      align-items: flex-start;
      gap: $sp-2;
      margin-top: $sp-3;
    }

    &__info-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: rgba($green, 0.08);
      color: $green;
      flex-shrink: 0;
    }

    &__info-title {
      margin: 0;
      font-size: 0.875rem;
      font-weight: 700;
      color: #111827;
    }

    &__info-text {
      margin: 2px 0 0;
      font-size: 0.8125rem;
      line-height: 1.4;
      color: #667085;
    }
  }
</style>
