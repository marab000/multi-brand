<script lang="ts">
  import { cart } from '$lib/stores/cart';
  import { formatPrice } from '$lib/utils/formatPrice';
  import { SITE_PHONE, SITE_URL, SITE_URL_NAME, SITE_PHONE_MOBILE } from '$lib/config/site';
  import { toast } from 'svelte-sonner';
  import { FileText } from 'lucide-svelte';
  import logoUrl from '$lib/assets/logo1.png';
  import notoRegularUrl from '$lib/assets/fonts/NotoSans-Regular.ttf';
  import notoBoldUrl from '$lib/assets/fonts/NotoSans-Bold.ttf';

  export let total = 0;

  let isExporting = false;

  const blobToDataUrl = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const compressImage = (dataUrl: string, max = 800, quality = 0.7) =>
    new Promise<string>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ratio = Math.min(max / img.width, max / img.height, 1);
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(dataUrl);
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
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

  const loadRemoteImage = async (url: string) => {
    try {
      const response = await fetch(`/api/image-base64?url=${encodeURIComponent(url)}`);
      if (!response.ok) return null;
      const data = await response.json();
      if (!data.dataUrl) return null;
      return await compressImage(data.dataUrl, 800, 0.7);
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

  const createCartExport = async () => {
    const items = $cart.map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      qty: item.qty,
      slug: item.slug ?? null,
      image: item.image ?? null
    }));
    const response = await fetch('/api/cart-exports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, total_price: total })
    });
    if (!response.ok) throw new Error('Cart export create failed');
    return await response.json();
  };

  const getItemLink = (item: any) => {
    if (item?.url) return item.url;
    if (item?.slug) return `${SITE_URL}/products/${item.slug}`;
    return '';
  };

  const getItemDescription = (item: any) => {
    const parts: string[] = [];
    if (item.brand) parts.push(`Бренд: ${item.brand}`);
    if (item.color) parts.push(`Цвет: ${item.color}`);
    if (item.material) parts.push(`Материал: ${item.material}`);
    if (item.guarantee) parts.push(`Гарантия: ${item.guarantee}`);
    if (item.description) parts.push(String(item.description).trim());
    return parts.filter(Boolean).join('\n\n');
  };

  const splitText = (text: string, maxLength = 72) => {
    if (!text) return '';
    const result: string[] = [];
    const parts = text.split('\n');
    parts.forEach((part, partIndex) => {
      const words = part.split(/\s+/);
      let current = '';
      for (const word of words) {
        const next = current ? `${current} ${word}` : word;
        if (next.length > maxLength) {
          if (current) result.push(current);
          current = word;
        } else {
          current = next;
        }
      }
      if (current) result.push(current);
      if (partIndex !== parts.length - 1) result.push('');
    });
    return result.join('\n');
  };

  const drawHeader = (doc: any, logoDataUrl: string | null, pageWidth: number) => {
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
    doc.text('Multibrend2005@yandex.ru', contactX + 48, 78);
    doc.setTextColor(29, 78, 216);
    doc.textWithLink(SITE_URL_NAME, contactX + 48, 98, { url: SITE_URL });
    const siteWidth = doc.getTextWidth(SITE_URL_NAME);
    doc.line(contactX + 48, 101, contactX + 48 + siteWidth, 101);
    doc.setTextColor(30, 30, 30);
  };

  const exportPdf = async () => {
    if (!$cart.length) {
      toast.error('Корзина пуста');
      return;
    }
    isExporting = true;
    try {
      const cartExport = await createCartExport();
      const exportNumber = cartExport.export_number ?? cartExport.id;
      const [{ default: jsPDF }, autoTableModule, logoDataUrl, notoRegular, notoBold, itemImages] =
        await Promise.all([
          import('jspdf'),
          import('jspdf-autotable'),
          loadLocalImage(logoUrl),
          loadFontBase64(notoRegularUrl),
          loadFontBase64(notoBoldUrl),
          Promise.all(
            $cart.map((item) => (item.image ? loadRemoteImage(item.image) : Promise.resolve(null)))
          )
        ]);
      const autoTable = autoTableModule.default;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      doc.addFileToVFS('NotoSans-Regular.ttf', notoRegular);
      doc.addFileToVFS('NotoSans-Bold.ttf', notoBold);
      doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
      doc.addFont('NotoSans-Bold.ttf', 'NotoSans', 'bold');
      doc.setFont('NotoSans', 'normal');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const now = new Date();
      const fileDate = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;
      drawHeader(doc, logoDataUrl, pageWidth);
      doc.setFont('NotoSans', 'bold');
      doc.setFontSize(17);
      doc.text(`Коммерческое предложение №${exportNumber}`, 40, 122);
      doc.setFont('NotoSans', 'normal');
      doc.setFontSize(10);
      doc.text(`Дата: ${fileDate}`, 40, 140);
      autoTable(doc, {
        startY: 162,
        head: [['Название', 'Фото', 'Цена', 'Ссылка/Описание']],
        body: $cart.map((item) => {
          const description = getItemDescription(item) || 'Описание отсутствует';
          return [
            splitText(item.name, 22),
            '',
            `${formatPrice(item.price)} ₽`,
            splitText(description, 42)
          ];
        }),
        theme: 'grid',
        rowPageBreak: 'avoid',
        margin: { left: 40, right: 40, top: 132, bottom: 54 },
        styles: {
          font: 'NotoSans',
          fontSize: 8.5,
          cellPadding: 7,
          lineColor: [70, 70, 70],
          lineWidth: 0.7,
          textColor: [20, 20, 20],
          valign: 'middle',
          overflow: 'linebreak',
          minCellHeight: 210
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [20, 20, 20],
          fontStyle: 'bold',
          minCellHeight: 22,
          halign: 'center'
        },
        columnStyles: {
          0: { cellWidth: 95, halign: 'center', fontStyle: 'bold' },
          1: { cellWidth: 200, halign: 'center', valign: 'middle' },
          2: { cellWidth: 86, halign: 'center', fontStyle: 'bold' },
          3: { cellWidth: 134 }
        },
        didDrawPage: () => {
          drawHeader(doc, logoDataUrl, pageWidth);
        },
        didDrawCell: (data: any) => {
          if (data.section === 'body' && data.column.index === 1) {
            const image = itemImages[data.row.index];
            if (!image) return;
            try {
              const props = doc.getImageProperties(image);
              const maxWidth = data.cell.width - 24;
              const maxHeight = data.cell.height - 24;
              let width = maxWidth;
              let height = (props.height * width) / props.width;
              if (height > maxHeight) {
                height = maxHeight;
                width = (props.width * height) / props.height;
              }
              const x = data.cell.x + (data.cell.width - width) / 2;
              const y = data.cell.y + (data.cell.height - height) / 2;
              doc.addImage(image, 'JPEG', x, y, width, height);
            } catch {}
          }
          if (data.section === 'body' && data.column.index === 3) {
            const item = $cart[data.row.index];
            if (!item) return;
            const url = getItemLink(item);
            if (!url) return;
            const linkText = 'Открыть товар';
            const x = data.cell.x + 7;
            const y = data.cell.y + data.cell.height - 18;
            doc.setFont('NotoSans', 'normal');
            doc.setFontSize(8.5);
            doc.setTextColor(29, 78, 216);
            doc.text(linkText, x, y);
            const linkWidth = doc.getTextWidth(linkText);
            doc.line(x, y + 1.5, x + linkWidth, y + 1.5);
            doc.link(x, y - 9, linkWidth, 12, { url });
            doc.setTextColor(20, 20, 20);
          }
        }
      });
      const finalY = (doc as any).lastAutoTable?.finalY || 162;
      const hasSpaceForTotal = finalY + 160 < pageHeight - 54;
      if (!hasSpaceForTotal) doc.addPage();
      const totalStartY = hasSpaceForTotal ? finalY + 36 : 160;
      doc.setFont('NotoSans', 'bold');
      doc.setFontSize(12);
      doc.text('Итоговый расчет', pageWidth / 2, totalStartY - 16, { align: 'center' });
      autoTable(doc, {
        startY: totalStartY,
        head: [['№', 'Товар', 'Кол-во', 'Цена', 'Сумма']],
        body: $cart.map((item, index) => [
          String(index + 1),
          item.name,
          String(item.qty),
          `${formatPrice(item.price)} ₽`,
          `${formatPrice(item.price * item.qty)} ₽`
        ]),
        foot: [['', '', '', 'Итого', `${formatPrice(total)} ₽`]],
        showFoot: 'lastPage',
        theme: 'grid',
        margin: { left: 40, right: 40, bottom: 70 },
        styles: {
          font: 'NotoSans',
          fontSize: 8.5,
          cellPadding: 6,
          lineColor: [70, 70, 70],
          lineWidth: 0.6,
          textColor: [20, 20, 20],
          valign: 'middle'
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [20, 20, 20],
          fontStyle: 'bold',
          halign: 'center'
        },
        footStyles: { fillColor: [255, 255, 255], textColor: [20, 20, 20], fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 35, halign: 'right' },
          1: { cellWidth: 260 },
          2: { cellWidth: 58, halign: 'center' },
          3: { cellWidth: 86, halign: 'right' },
          4: { cellWidth: 86, halign: 'right' }
        }
      });
      doc.setFont('NotoSans', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(30, 30, 30);
      doc.text(
        doc.splitTextToSize(
          '*Ценовое предложение действует ограниченный срок. Перед оформлением обязательно уточняйте конечную стоимость товаров у менеджера.',
          pageWidth - 80
        ),
        40,
        pageHeight - 34
      );
      doc.save(`commercial-offer-${exportNumber}-${fileDate}.pdf`);
      toast.success(`PDF выгружен. Номер КП: ${exportNumber}`);
    } catch (error) {
      console.error(error);
      toast.error('Не удалось сформировать PDF');
    } finally {
      isExporting = false;
    }
  };
</script>

<button class="btn export-btn my-3 ml-auto" on:click={exportPdf} disabled={isExporting}>
  <FileText size="16" />
  <span>{isExporting ? 'Формируем PDF...' : 'Скачать в pdf'}</span>
</button>

<style lang="scss">
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
