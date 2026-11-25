<script lang="ts">
  // брендовые логотипы платёжных систем (ревью 23.11: «generic иконки не подходят,
  // у СБП определённая иконка — она и должна быть, как и t-pay и прочее»).
  // Источники: Wikimedia Commons (МИР, СБП, SberPay PNG), logo-teka (T-Pay).
  import mirLogo from '$lib/assets/payments/mir.svg';
  import tpayLogo from '$lib/assets/payments/tpay.png';
  import sbpLogo from '$lib/assets/payments/sbp.svg';
  import sberpayLogo from '$lib/assets/payments/sberpay.png';

  const methods = [
    { src: mirLogo, alt: 'МИР — платёжная система' },
    { src: tpayLogo, alt: 'T-Pay' },
    { src: sbpLogo, alt: 'СБП — система быстрых платежей' },
    { src: sberpayLogo, alt: 'SberPay' }
  ];
</script>

<div class="payment-methods">
  <span class="payment-methods__title">Способы оплаты</span>
  <div class="payment-methods__icons">
    {#each methods as m}
      <div class="payment-method" title={m.alt}>
        <img src={m.src} alt={m.alt} />
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
    // белые капсулы: брендовые лого (МИР, T-Pay тёмные) не теряются на тёмном футере
    display: flex;
    align-items: center;
    justify-content: center;
    height: 36px;
    padding: 0 10px;
    border-radius: 8px;
    background: #fff;
    img {
      display: block;
      height: 16px;
      width: auto;
    }
  }
</style>
