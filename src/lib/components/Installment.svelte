<script lang="ts">
  import { CalendarDays } from 'lucide-svelte';
  import { formatPrice } from '$lib/utils/formatPrice';
  import { getInstallmentLabel, getMonthlyPayment } from '$lib/utils/pricing';

  // Единый блок рассрочки для карточки каталога и страницы товара:
  // «от X ₽/мес. на 12 мес.» и серой припиской «Подробности уточняйте у менеджера»
  export let price: number | string | null | undefined;
  // в узких карточках приписка не помещается — показываем только на странице товара
  export let compact = false;

  const monthlyPayment = getMonthlyPayment(price);
</script>

<div class="installment">
  <div class="installment-main">
    <CalendarDays size={14} strokeWidth={2.2} />
    <span class="installment-text">
      от {formatPrice(monthlyPayment)} ₽/мес. {getInstallmentLabel()}
    </span>
  </div>
  {#if !compact}
    <span class="installment-note">Подробности уточняйте у менеджера</span>
  {/if}
</div>

<style lang="scss">
  /* переменные $sp-* приходят глобально (svelte.config prependData) */

  .installment {
    display: flex;
    flex-direction: column;
    gap: 2px;
    max-width: 100%;
  }
  .installment-main {
    display: flex;
    align-items: center;
    gap: $sp-2;
    color: #111827;
    font-size: 0.8125rem;
    font-weight: 600;
    line-height: 1.25;
    :global(svg) {
      flex: 0 0 auto;
      color: #111827;
    }
  }
  .installment-text {
    white-space: normal;
  }
  .installment-note {
    color: #94a3b8;
    font-size: 0.75rem;
    font-weight: 500;
    line-height: 1.25;
  }
</style>
