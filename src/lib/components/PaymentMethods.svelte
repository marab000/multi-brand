<script lang="ts">
  import { QrCode, CreditCard, Banknote, Send, Smartphone, Wallet } from 'lucide-svelte';

  const methods = [
    { icon: QrCode, label: 'Оплата по QR' },
    { icon: Smartphone, label: 'Терминал' },
    { icon: CreditCard, label: 'Кредитная карта' },
    { icon: Wallet, label: 'Картой' },
    { icon: Banknote, label: 'Наличные' },
    { icon: Send, label: 'Перевод на карту' }
  ];
</script>

<div class="payment-methods">
  <span class="payment-methods__title">Способы оплаты</span>
  <div class="payment-methods__icons">
    {#each methods as m}
      <div class="payment-method" title={m.label}>
        <m.icon size={26} strokeWidth={1.8} />
      </div>
    {/each}
  </div>
</div>

<style lang="scss">
  .payment-methods {
    margin-bottom: 16px;
  }
  .payment-methods__title {
    display: block;
    margin-bottom: 10px;
    font-size: 13px;
    font-weight: 700;
    color: #cbd5e1;
  }
  .payment-methods__icons {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  .payment-method {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.08);
    color: #cbd5e1;
    transition: 0.15s ease;
    &:hover {
      background: rgba(255, 255, 255, 0.15);
      color: #fff;
    }
  }
</style>
