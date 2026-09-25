<script lang="ts">
  import type { PageData } from './$types';
  import { formatPrice } from '$lib/utils/formatPrice';
  import { generateOfferPdf } from '$lib/pdf/commercialOffer';
  import { toast } from 'svelte-sonner';
  import { FileText } from 'lucide-svelte';

  export let data: PageData;

  let exportingId: number | null = null;

  const getItems = (items: any) => (Array.isArray(items) ? items : []);
  const formatDate = (value: string) => {
    const d = new Date(value);
    return d.toLocaleDateString('ru-RU');
  };

  async function downloadPdf(offer: any) {
    exportingId = offer.id;
    try {
      await generateOfferPdf({
        exportNumber: offer.export_number ?? offer.id,
        items: getItems(offer.items),
        totalPrice: Number(offer.total_price ?? 0),
        discountPercent: Number(offer.discount_percent ?? 0)
      });
    } catch (e) {
      console.error(e);
      toast.error('Не удалось сформировать PDF');
    } finally {
      exportingId = null;
    }
  }
</script>

<svelte:head>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>


<div class="account-offers">
  <h2>Мои КП</h2>
  {#if !data.offers.length}
    <p class="empty">У вас пока нет коммерческих предложений. Соберите корзину и нажмите «Скачать в pdf»</p>
  {:else}
    <div class="offers">
      {#each data.offers as offer (offer.id)}
        <article class="offer">
          <div class="offer__info">
            <h3>КП №{offer.export_number ?? offer.id}</h3>
            <p class="offer__meta">
              от {formatDate(offer.created_at)} ·
              {getItems(offer.items).length} тов. ·
              {formatPrice(Number(offer.total_price ?? 0))} ₽
              {#if Number(offer.discount_percent) > 0}
                <span class="offer__discount">скидка {offer.discount_percent}%</span>
              {/if}
            </p>
          </div>
          <button class="offer__pdf" onclick={() => downloadPdf(offer)} disabled={exportingId === offer.id}>
            <FileText size="15" />
            {exportingId === offer.id ? 'Формируем...' : 'Скачать PDF'}
          </button>
        </article>
      {/each}
    </div>
  {/if}
</div>

<style lang="scss">
  .account-offers {
    h2 {
      margin-bottom: 20px;
      font-size: 24px;
      font-weight: 700;
    }
  }
  .empty {
    color: #64748b;
    font-size: 15px;
  }
  .offers {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .offer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 16px 20px;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    background: #fff;
    flex-wrap: wrap;
    h3 {
      font-size: 16px;
      font-weight: 700;
    }
    &__meta {
      margin-top: 4px;
      font-size: 14px;
      color: #64748b;
    }
    &__discount {
      color: $green;
      font-weight: 600;
    }
    &__pdf {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      height: 40px;
      padding: 0 16px;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      background: #fff;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      &:hover:not(:disabled) {
        border-color: $green;
        color: $green;
      }
      &:disabled {
        opacity: 0.6;
        cursor: wait;
      }
    }
  }
</style>
