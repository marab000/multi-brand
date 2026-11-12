<script lang="ts">
  import { ChevronRight } from 'lucide-svelte';
  import LeadRequestModal from '$lib/components/LeadRequestModal.svelte';

  // тёмно-зелёный блок-акция (из демо-лендингов брендов), контент через пропс offer
  let {
    offer
  }: {
    offer: {
      eyebrow: string;
      titleLines: string[]; // заголовок построчно
      text: string;
      buttonLabel: string;
      leadTitle: string;
      note: string;
      benefits: { title: string; text: string }[];
    };
  } = $props();

  let requestOpen = $state(false);
  const prefill = offer.leadTitle;

  const submit = () => {
    requestOpen = true;
  };
</script>

<div class="offer">
  <div class="offer__copy">
    <div class="offer__eyebrow">{offer.eyebrow}</div>
    <h2>
      {#each offer.titleLines as line, i}{#if i > 0}<br />{/if}{line}{/each}
    </h2>
    <p class="offer__text">{offer.text}</p>
    <button type="button" class="btn secondary-light offer__btn" onclick={submit}>
      <span>{offer.buttonLabel}</span>
      <ChevronRight size={18} strokeWidth={2.3} />
    </button>
    <p class="offer__note">{offer.note}</p>
  </div>
  <div class="offer__benefits">
    {#each offer.benefits as benefit, i}
      <article class="benefit">
        <span class="benefit__num">{String(i + 1).padStart(2, '0')}</span>
        <h3>{benefit.title}</h3>
        <p>{benefit.text}</p>
      </article>
    {/each}
  </div>
</div>
<LeadRequestModal bind:open={requestOpen} {prefill} />

<style lang="scss">
  @use 'sass:color';

  .offer {
    display: grid;
    gap: $sp-6;
    padding: $sp-4;
    border-radius: 24px;
    background: #{$green};
    color: #fff;
    @media (min-width: 1024px) {
      grid-template-columns: 0.95fr 1.05fr;
      align-items: start;
      gap: $sp-8;
      padding: $sp-8;
    }
  }
  .offer__eyebrow {
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }
  .offer__copy {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: $sp-3;
    h2 {
      margin: 0;
      color: #fff;
      font-size: 1.75rem;
      line-height: 1.1;
      font-weight: 700;
      letter-spacing: -0.03em;
      @media (min-width: 1024px) {
        font-size: 2.25rem;
      }
    }
  }
  .offer__text {
    margin: 0;
    max-width: 480px;
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.9375rem;
    line-height: 1.55;
  }
  .offer__btn {
    // цвет — от btn.secondary-light (жёлтая с тёмным текстом, как «Подобрать
    // комплект»); здесь только геометрия под тёмный блок-акцию.
    // height явно: перебивает height: 44px базового .btn
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $sp-2;
    height: 52px;
    margin-top: $sp-2;
    padding: 0 22px;
    border: 0;
    border-radius: 12px;
    font-size: 0.9375rem;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.18s ease;
    span {
      text-align: left;
    }
  }
  .offer__note {
    margin: $sp-2 0 0;
    max-width: 480px;
    color: rgba(255, 255, 255, 0.55);
    font-size: 0.75rem;
    line-height: 1.5;
  }
  .offer__benefits {
    display: grid;
    grid-template-columns: 1fr;
    gap: $sp-6 $sp-4;
    @media (min-width: 640px) {
      grid-template-columns: 1fr 1fr;
    }
  }
  .benefit {
    display: flex;
    flex-direction: column;
    gap: $sp-2;
    &__num {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border: 1px solid rgba(255, 255, 255, 0.35);
      border-radius: 50%;
      color: rgba(255, 255, 255, 0.7);
      font-size: 0.75rem;
      font-weight: 600;
    }
    h3 {
      margin: $sp-1 0 0;
      color: #fff;
      font-size: 1.0625rem;
      line-height: 1.25;
      font-weight: 700;
    }
    p {
      margin: 0;
      color: rgba(255, 255, 255, 0.75);
      font-size: 0.85rem;
      line-height: 1.5;
    }
  }
</style>
