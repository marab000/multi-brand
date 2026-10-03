<script lang="ts">
  // П.25: попап «Купили технику, а ремонт ещё идёт?» — раз в 7 дней на клиента
  import { onMount } from 'svelte';
  import { X } from 'lucide-svelte';

  const KEY = 'storage-popup-dismissed-at';
  const SHOW_DELAY_MS = 4000;
  const REREAD_AFTER_DAYS = 7;

  let visible = $state(false);

  onMount(() => {
    const dismissed = Number(localStorage.getItem(KEY) ?? 0);
    if (Date.now() - dismissed < REREAD_AFTER_DAYS * 86_400_000) return;
    const t = setTimeout(() => (visible = true), SHOW_DELAY_MS);
    return () => clearTimeout(t);
  });

  function close() {
    visible = false;
    localStorage.setItem(KEY, String(Date.now()));
  }
</script>

{#if visible}
  <div class="spopup" role="dialog" aria-modal="true" aria-label="Бесплатное хранение техники">
    <div class="spopup__card">
      <button class="spopup__close" onclick={close} aria-label="Закрыть">
        <X size={18} strokeWidth={2.4} />
      </button>
      <span class="spopup__emoji">📦</span>
      <h2>Купили технику, а ремонт ещё идёт?</h2>
      <p>Храним бесплатно до 12 месяцев на охраняемом складе. Привезём ровно к нужной дате.</p>
      <button class="spopup__cta" onclick={close}>Отлично</button>
    </div>
  </div>
{/if}

<style lang="scss">
  .spopup {
    position: fixed;
    inset: 0;
    z-index: 1200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    background: rgba(15, 23, 42, 0.55);

    &__card {
      position: relative;
      max-width: 420px;
      width: 100%;
      padding: 30px 28px 26px;
      border-radius: 20px;
      background: #fff;
      text-align: center;
      box-shadow: 0 24px 64px rgba(15, 23, 42, 0.3);
    }
    &__close {
      position: absolute;
      top: 12px;
      right: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: none;
      border-radius: 8px;
      background: #f1f5f9;
      color: #64748b;
      cursor: pointer;
      &:hover {
        background: #e2e8f0;
      }
    }
    &__emoji {
      font-size: 40px;
    }
    h2 {
      margin: 10px 0 8px;
      font-size: 20px;
      font-weight: 800;
      line-height: 1.25;
      color: #111827;
    }
    p {
      margin: 0 0 18px;
      font-size: 14.5px;
      line-height: 1.55;
      color: #475569;
    }
    &__cta {
      width: 100%;
      padding: 12px 18px;
      border: none;
      border-radius: 12px;
      background: $green;
      color: #fff;
      font: inherit;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      &:hover {
        background: #35994e;
      }
    }
  }
</style>
