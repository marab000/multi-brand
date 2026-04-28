<script lang="ts">
  import type { PageData } from './$types';
  import { cart } from '$lib/stores/cart';
  import { formatPrice } from '$lib/utils/formatPrice';
  import { apiFetch } from '$lib/api';
  import { toast } from 'svelte-sonner';
  import Modal from '$lib/components/Modal.svelte';
  import { Minus, Plus, Trash, FileText } from 'lucide-svelte';
  import { phoneMask } from '$lib/actions/phoneMask';
  import { getPhoneLocalDigits, isValidRuPhone, normalizeRuPhone } from '$lib/utils/phone';
  import logoUrl from '$lib/assets/logo1.png';
  import notoRegularUrl from '$lib/assets/fonts/NotoSans-Regular.ttf';
  import notoBoldUrl from '$lib/assets/fonts/NotoSans-Bold.ttf';
  import {
    SITE_EMAIL,
    SITE_PHONE,
    SITE_URL,
    SITE_PHONE_MOBILE,
    SITE_URL_NAME
  } from '$lib/config/site';

  export let data: PageData;

  let name = data.user?.full_name ?? '';
  let phone = getPhoneLocalDigits(data.user?.phone);
  let showModal = false;
  let total = 0;
  let isExporting = false;

  const submit = async () => {
    if (!name.trim()) {
      toast.error('Введите имя');
      return;
    }
    if (!isValidRuPhone(phone)) {
      toast.error('Введите корректный номер телефона');
      return;
    }
    const items = $cart.map((i) => ({
      id: i.id,
      name: i.name,
      price: i.price,
      qty: i.qty,
      slug: i.slug ?? null
    }));
    try {
      await apiFetch(fetch, '/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          name,
          phone: normalizeRuPhone(phone),
          items
        }),
        headers: { 'Content-Type': 'application/json' }
      });
      showModal = true;
      cart.clear();
      if (!data.user) {
        name = '';
        phone = '';
      }
    } catch {
      toast.error('Ошибка при оформлении заказа');
    }
  };

  const blobToDataUrl = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const loadLocalImage = async (url: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      const blob = await response.blob();
      return await blobToDataUrl(blob);
    } catch {
      return null;
    }
  };

  const loadFontBase64 = async (url: string) => {
    const response = await fetch(url);
    const blob = await response.blob();
    const dataUrl = await blobToDataUrl(blob);
    return dataUrl.split(',')[1];
  };

  const getItemLink = (item: any) => {
    if (item.url) return item.url;
    if (item.slug) return `${SITE_URL}/products/${item.slug}`;
    return '';
  };

  const getItemDescription = (item: any) => {
    const parts: string[] = [];
    if (item.brand) parts.push(`Бренд: ${item.brand}`);
    if (item.color) parts.push(`Цвет: ${item.color}`);
    if (item.material) parts.push(`Материал: ${item.material}`);
    if (item.guarantee) parts.push(`Гарантия: ${item.guarantee}`);
    if (item.description) parts.push(String(item.description).trim());
    return parts.filter(Boolean).join('\n');
  };

  const splitText = (text: string, maxLength = 70) => {
    if (!text) return '';
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let current = '';
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (next.length > maxLength) {
        if (current) lines.push(current);
        current = word;
      } else {
        current = next;
      }
    }
    if (current) lines.push(current);
    return lines.join('\n');
  };

  const exportPdf = async () => {
    if (!$cart.length) {
      toast.error('Корзина пуста');
      return;
    }
    isExporting = true;
    try {
      const [{ default: jsPDF }, autoTableModule, logoDataUrl, notoRegular, notoBold] =
        await Promise.all([
          import('jspdf'),
          import('jspdf-autotable'),
          loadLocalImage(logoUrl),
          loadFontBase64(notoRegularUrl),
          loadFontBase64(notoBoldUrl)
        ]);
      const autoTable = autoTableModule.default;
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: 'a4'
      });
      doc.addFileToVFS('NotoSans-Regular.ttf', notoRegular);
      doc.addFileToVFS('NotoSans-Bold.ttf', notoBold);
      doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
      doc.addFont('NotoSans-Bold.ttf', 'NotoSans', 'bold');
      doc.setFont('NotoSans', 'normal');

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const now = new Date();
      const fileDate = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;

      if (logoDataUrl) {
        const props = doc.getImageProperties(logoDataUrl);
        const width = 96;
        const height = (props.height * width) / props.width;
        doc.addImage(logoDataUrl, 'PNG', 40, 28, width, height);
      } else {
        doc.setFont('NotoSans', 'bold');
        doc.setFontSize(12);
        doc.text('Логотип', 40, 50);
      }

      const contactX = pageWidth - 220;
      doc.setFontSize(12);
      doc.setTextColor(20, 20, 20);
      doc.setFont('NotoSans', 'bold');
      doc.text('Тел.', contactX, 38);
      doc.text('Моб.', contactX, 58);
      doc.text('E-mail', contactX, 78);
      doc.text('Сайт', contactX, 98);
      doc.setFont('NotoSans', 'normal');
      doc.text(SITE_PHONE, contactX + 48, 38);
      doc.text(SITE_PHONE_MOBILE, contactX + 48, 58);
      doc.text(SITE_EMAIL, contactX + 48, 78);
      doc.setTextColor(29, 78, 216);
      doc.textWithLink(SITE_URL_NAME, contactX + 48, 98, {
        url: SITE_URL
      });
      const siteWidth = doc.getTextWidth(SITE_URL_NAME);
      doc.line(contactX + 48, 101, contactX + 48 + siteWidth, 101);
      doc.setTextColor(30, 30, 30);

      doc.setFont('NotoSans', 'bold');
      doc.setFontSize(18);
      doc.text('Коммерческое предложение', 40, 110);

      doc.setFont('NotoSans', 'normal');
      doc.setFontSize(11);
      doc.text(`Дата: ${fileDate}`, 40, 130);

      const rows = $cart.map((item) => {
        const link = getItemLink(item);
        const description = getItemDescription(item);
        return [
          splitText(item.name, 32),
          `${formatPrice(item.price)} ₽`,
          String(item.qty),
          `${formatPrice(item.price * item.qty)} ₽`,
          splitText(description || 'Описание отсутствует', 40),
          link || 'Ссылка отсутствует'
        ];
      });

      autoTable(doc, {
        startY: 150,
        head: [['Название', 'Цена', 'Кол-во', 'Сумма', 'Описание', 'Ссылка']],
        body: rows,
        theme: 'grid',
        margin: { left: 40, right: 40 },
        styles: {
          font: 'NotoSans',
          fontSize: 10,
          cellPadding: 8,
          lineColor: [210, 210, 210],
          lineWidth: 1,
          textColor: [30, 30, 30],
          valign: 'middle',
          overflow: 'linebreak'
        },
        headStyles: {
          fillColor: [245, 245, 245],
          textColor: [20, 20, 20],
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { cellWidth: 170 },
          1: { cellWidth: 80, halign: 'right' },
          2: { cellWidth: 60, halign: 'center' },
          3: { cellWidth: 90, halign: 'right' },
          4: { cellWidth: 210 },
          5: { cellWidth: 165 }
        },
        didParseCell: (data: any) => {
          if (
            data.section === 'body' &&
            data.column.index === 5 &&
            data.cell.raw !== 'Ссылка отсутствует'
          ) {
            data.cell.text = ['Открыть товар'];
            data.cell.styles.textColor = [29, 78, 216];
            data.cell.styles.fontStyle = 'normal';
          }
        },
        didDrawCell: (data: any) => {
          if (data.section !== 'body' || data.column.index !== 5) return;
          const url = data.cell.raw;
          if (!url || url === 'Ссылка отсутствует') return;
          doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url });
        }
      });

      const finalY = (doc as any).lastAutoTable?.finalY || 150;
      doc.setFont('NotoSans', 'bold');
      doc.setFontSize(14);
      doc.text(`Итого: ${formatPrice(total)} ₽`, pageWidth - 40, finalY + 30, { align: 'right' });

      doc.setFont('NotoSans', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(30, 30, 30);
      doc.text(
        '*Ценовое предложение действует ограниченный срок. Перед оформлением обязательно уточняйте конечную стоимость товаров у менеджера.',
        40,
        pageHeight - 34
      );

      doc.save(`commercial-offer-${fileDate}.pdf`);
      toast.success('PDF выгружен');
    } catch (error) {
      console.error(error);
      toast.error('Не удалось сформировать PDF');
    } finally {
      isExporting = false;
    }
  };

  $: total = $cart.reduce((sum, i) => sum + i.price * i.qty, 0);

  const closeModal = () => (showModal = false);
</script>

<div class="cart-page">
  <h1>Корзина</h1>
  {#if $cart.length === 0}
    <p class="empty">Корзина пуста</p>
  {:else}
    <div class="cart flex flex-col gap-3 lg:grid lg:gap-5">
      <div class="items">
        {#each $cart as item}
          <div class="item flex! justify-around lg:grid!">
            <img src={item.image ?? '/images/no_image.png'} alt={item.name} />
            <div class="info">
              <h3>{item.name}</h3>
              <p>{formatPrice(item.price)} ₽</p>
            </div>
            <div class="qty flex flex-col gap-3">
              <p class="block text-center font-semibold lg:hidden">
                {formatPrice(item.price * item.qty)} ₽
              </p>
              <div class="flex items-center gap-2">
                <button on:click={() => cart.dec(item.id)}
                  ><Minus size="14" strokeWidth="2.5" /></button
                >
                <span>{item.qty}</span>
                <button on:click={() => cart.inc(item.id)}
                  ><Plus size="14" strokeWidth="2.5" /></button
                >
              </div>
            </div>
            <p class="hidden text-[0.9rem] font-semibold lg:block lg:text-[1rem]!">
              {formatPrice(item.price * item.qty)} ₽
            </p>
            <button class="remove" on:click={() => cart.remove(item.id)}
              ><Trash size="14" strokeWidth="2.5" /></button
            >
          </div>
        {/each}
      </div>
      <div>
        <div class="checkout">
          <div class="total">
            <span>Итого:</span>
            <b>{formatPrice(total)} ₽</b>
          </div>
          <input class="input primary" placeholder="Ваше имя" bind:value={name} />
          <div class="with-prefix">
            <span class="prefix">+7</span>
            <input
              class="input primary"
              placeholder="999 123 45 67"
              autocomplete="tel"
              inputmode="numeric"
              value={phone}
              use:phoneMask={{ value: phone, onAccept: (digits) => (phone = digits) }}
            />
          </div>
          <div class="actions">
            <button class="btn primary" on:click={submit}>Перейти к оплате</button>
          </div>
        </div>
        <button class="btn export-btn my-3 ml-auto" on:click={exportPdf} disabled={isExporting}>
          <FileText size="16" />
          <span>{isExporting ? 'Формируем PDF...' : 'Скачать в pdf'}</span>
        </button>
      </div>
    </div>
  {/if}
</div>

<Modal
  open={showModal}
  text="Мы получили ваш заказ! Скоро свяжемся с вами, чтобы уточнить детали."
  on:close={closeModal}
/>

<style lang="scss">
  .cart-page {
    h1 {
      margin-bottom: 20px;
      font-size: 28px;
      font-weight: 600;
    }
    .empty {
      color: #777;
    }
    .cart {
      grid-template-columns: 1fr 320px;
      .items {
        display: flex;
        flex-direction: column;
        gap: 12px;
        .item {
          display: grid;
          grid-template-columns:
            minmax(50px, 80px) minmax(100px, 1fr) minmax(70px, 100px) minmax(70px, 100px)
            minmax(20px, 40px);
          align-items: center;
          gap: 12px;
          padding: 12px;
          border: 1px solid #eee;
          border-radius: 12px;
          background: #fff;
          img {
            width: 80px;
            height: 80px;
            object-fit: contain;
          }
          .info {
            h3 {
              font-size: 14px;
              font-weight: 600;
            }
            p {
              font-size: 13px;
              color: #777;
            }
          }
          .qty {
            button {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 28px;
              height: 28px;
              border-radius: 6px;
              background: #f3f3f3;
              text-align: center;
              &:hover {
                background: #e6e4e4;
                opacity: 0.9;
              }
            }
          }
          .remove {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 33px;
            height: 33px;
            border: 1px solid rgba(255, 0, 0, 0.25);
            border-radius: 12px;
            color: rgba(255, 0, 0, 0.5);
            &:hover {
              border: 1px solid rgba(255, 0, 0, 0.5);
              background: rgba(255, 0, 0, 0.05);
            }
          }
        }
      }
    }
    .checkout {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: auto;
      padding: 16px;
      border: 1px solid #eee;
      border-radius: 12px;
      background: #fff;
      .total {
        display: flex;
        justify-content: space-between;
        font-size: 18px;
      }
      .actions {
        display: flex;
        flex-direction: column;
        gap: 10px;
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
  }
</style>
