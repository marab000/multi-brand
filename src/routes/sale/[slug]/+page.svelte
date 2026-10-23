<script lang="ts">
  import { BadgePercent, ArrowLeft } from 'lucide-svelte';

  let { data } = $props<{ data: { promo: { slug: string; headline: string; brand: string | null; image: string | null; dateText: string | null; descriptionText: string } } }>();

  const promo = $derived(data.promo);
</script>

<svelte:head>
  <title>{promo.headline} — акции — MULTIBRAND</title>
  <meta name="description" content={promo.headline} />
</svelte:head>

<div class="promo-detail mx-auto">
  <a class="back" href="/sale"><ArrowLeft size={16} strokeWidth={2.2} /><span>Все акции</span></a>

  <h1>{promo.headline}</h1>

  {#if promo.image}
    <div class="banner"><img src={promo.image} alt={promo.headline} /></div>
  {/if}

  {#if promo.dateText}
    <p class="date">Опубликовано поставщиком: {promo.dateText}</p>
  {/if}

  {#if promo.descriptionText}
    <div class="description">
      {promo.descriptionText}
    </div>
  {/if}

  <a class="back bottom" href="/sale"><ArrowLeft size={16} strokeWidth={2.2} /><span>Все акции</span></a>
</div>

<style lang="scss">
  .promo-detail {
    max-width: 860px;
  }
  .back {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin: 0 0 14px;
    color: #64748b;
    font-size: 0.875rem;
    font-weight: 600;
    text-decoration: none;
    &:hover {
      color: #111827;
    }
    &.bottom {
      margin-top: 22px;
    }
  }
  h1 {
    margin: 0 0 10px;
    font-size: 1.625rem;
    font-weight: 700;
    line-height: 1.2;
    color: #111827;
  }
  .banner {
    margin: 6px 0 16px;
    border-radius: 14px;
    overflow: hidden;
    border: 1px solid rgba(15, 23, 42, 0.08);
    background: #fff;
    img {
      width: 100%;
      display: block;
    }
  }
  .date {
    color: #94a3b8;
    font-size: 0.8125rem;
  }
  .description {
    font-size: 0.96875rem;
    line-height: 1.65;
    color: #1f2937;
    // чистый текст с переносами: читаемость исходника без болд-каши
    white-space: pre-line;
  }
</style>
