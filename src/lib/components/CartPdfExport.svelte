<script lang="ts">
  import { cart } from '$lib/stores/cart';
  import { toast } from 'svelte-sonner';
  import { FileText } from 'lucide-svelte';
  import { generateOfferPdf } from '$lib/pdf/commercialOffer';
  import { openAuthModal } from '$lib/stores/authModal.svelte';

  let { total = 0, user = null }: {
    total?: number;
    // Юзер из load корзины: null = гость; роль designer = может ставить скидку
    user?: { id: number; roles: string[] } | null;
  } = $props();

  let isExporting = false;
  let discountPercent = $state(0);

  const isDesigner = $derived(!!user?.roles?.includes('designer'));

  const exportPdf = async () => {
    if (!user) {
      openAuthModal('register');
      toast.info('КП доступны после входа или регистрации');
      return;
    }
    if (!$cart.length) {
      toast.error('Корзина пуста');
      return;
    }
    isExporting = true;
    try {
      const items = $cart.map((item: any) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        oldPrice: item.oldPrice ?? null,
        qty: item.qty,
        slug: item.slug ?? null,
        image: item.image ?? null
      }));
      const response = await fetch('/api/cart-exports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, total_price: total, discountPercent })
      });
      if (response.status === 401) {
        openAuthModal('register');
        toast.error('Для создания КП нужно войти или зарегистрироваться');
        return;
      }
      if (!response.ok) throw new Error('Cart export create failed');
      // Сервер пересчитывает цены из БД — используем их для PDF
      const cartExport = await response.json();
      const exportNumber = cartExport.export_number ?? cartExport.id;
      await generateOfferPdf({
        exportNumber,
        items: (cartExport.items ?? items) as any[],
        totalPrice: cartExport.total_price ?? total,
        discountPercent: cartExport.discount_percent ?? 0
      });
    } catch (error) {
      console.error(error);
      toast.error('Не удалось сформировать PDF');
    } finally {
      isExporting = false;
    }
  };
</script>

<div class="export-row">
  {#if isDesigner}
    <label class="discount-field">
      Скидка, %
      <input
        type="number"
        min="0"
        max="30"
        bind:value={discountPercent}
        oninput={(e) => {
          const v = Math.round(Number((e.currentTarget as HTMLInputElement).value) || 0);
          discountPercent = Math.min(30, Math.max(0, v));
        }}
      />
    </label>
  {/if}
  <button class="btn export-btn my-3" onclick={exportPdf} disabled={isExporting}>
    <FileText size="16" />
    <span>{isExporting ? 'Формируем PDF...' : 'Скачать в pdf'}</span>
  </button>
</div>

<style lang="scss">
  .export-row {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 16px;
    flex-wrap: wrap;
  }
  .discount-field {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: #475569;
    input {
      width: 70px;
      height: 40px;
      padding: 0 10px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 14px;
      &:focus {
        outline: none;
        border-color: $green;
      }
    }
  }
  .export-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: 1px solid transparent;
    &:disabled {
      opacity: 0.7;
      pointer-events: none;
    }
    :global(svg) {
      stroke: $yellow;
    }
    &:hover {
      border: 1px solid $yellow;
    }
  }
</style>
