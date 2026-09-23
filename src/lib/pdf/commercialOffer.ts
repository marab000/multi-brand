// Генерация PDF коммерческого предложения (клиентская, jsPDF).
// Используется из корзины (CartPdfExport) и из списка КП (/user/offers).
import { formatPrice } from '$lib/utils/formatPrice';
import { DISCOUNT_PERCENT } from '$lib/utils/pricing';
import { SITE_PHONE, SITE_URL, SITE_URL_NAME, SITE_PHONE_MOBILE2 } from '$lib/config/site';
import { toast } from 'svelte-sonner';
import logoUrl from '$lib/assets/logo1.png';
import notoRegularUrl from '$lib/assets/fonts/NotoSans-Regular.ttf';
import notoBoldUrl from '$lib/assets/fonts/NotoSans-Bold.ttf';

export type OfferItem = {
  id?: string;
  name: string;
  price: number;
  oldPrice?: number | null;
  qty: number;
  slug?: string | null;
  image?: string | null;
  url?: string | null;
  brand?: string | null;
};

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
  doc.text(SITE_PHONE_MOBILE2, contactX + 48, 58);
  doc.text('Multibrend2005@yandex.ru', contactX + 48, 78);
  doc.setTextColor(29, 78, 216);
  doc.textWithLink(SITE_URL_NAME, contactX + 48, 98, { url: SITE_URL });
  const siteWidth = doc.getTextWidth(SITE_URL_NAME);
  doc.line(contactX + 48, 101, contactX + 48 + siteWidth, 101);
  doc.setTextColor(30, 30, 30);
};

export async function generateOfferPdf(opts: {
  exportNumber: number | string;
  items: OfferItem[];
  totalPrice: number;
  discountPercent?: number;
}) {
  const { exportNumber, items, totalPrice, discountPercent = 0 } = opts;
  // Цена позиции с учётом ручной скидки (округляем до рубля)
  const withDiscount = (price: number) =>
    discountPercent > 0 ? Math.round(price * (1 - discountPercent / 100)) : price;
  const [{ default: jsPDF }, autoTableModule, logoDataUrl, notoRegular, notoBold, itemImages] =
    await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
      loadLocalImage(logoUrl),
      loadFontBase64(notoRegularUrl),
      loadFontBase64(notoBoldUrl),
      Promise.all(
        items.map((item) => (item.image ? loadRemoteImage(item.image) : Promise.resolve(null)))
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
  doc.setFont('NotoSans', 'bold');
  // Про акцию пишем только когда глобальная скидка реально включена (иначе вводит в заблуждение)
  if (DISCOUNT_PERCENT > 0) {
    doc.setFontSize(10);
    doc.setTextColor(210, 20, 30);
    doc.text(`В предложении учтены акционные цены на товары, участвующие в распродаже.`, 40, 156);
  }
  if (discountPercent > 0) {
    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(12);
    doc.text(`Скидка ${discountPercent}% учтена в ценах.`, 40, 174);
  }
  const tableStartY = discountPercent > 0 ? 196 : 176;
  doc.setTextColor(30, 30, 30);
  autoTable(doc, {
    startY: tableStartY,
    head: [['Название', 'Фото', 'Старая цена', 'Новая цена', 'Ссылка/Описание']],
    body: items.map((item: any) => {
      const description = getItemDescription(item) || 'Описание отсутствует';
      // Со скидкой: старая = базовая цена (или акционная oldPrice), новая = со скидкой
      const oldPriceCell =
        discountPercent > 0
          ? `${formatPrice(item.price)} ₽`
          : item.oldPrice
            ? `${formatPrice(item.oldPrice)} ₽`
            : '';
      const newPriceCell = `${formatPrice(withDiscount(item.price))} ₽`;
      return [
        splitText(item.name, 22),
        '',
        oldPriceCell,
        newPriceCell,
        splitText(description, 38)
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
      0: { cellWidth: 88, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 184, halign: 'center', valign: 'middle' },
      2: { cellWidth: 70, halign: 'center', textColor: [90, 90, 90] },
      3: { cellWidth: 74, halign: 'center', fontStyle: 'bold', textColor: [210, 20, 30] },
      4: { cellWidth: 99 }
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
      if (data.section === 'body' && data.column.index === 4) {
        const item = items[data.row.index];
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
  const finalY = (doc as any).lastAutoTable?.finalY || tableStartY;
  const hasSpaceForTotal = finalY + 160 < pageHeight - 54;
  if (!hasSpaceForTotal) doc.addPage();
  const totalStartY = hasSpaceForTotal ? finalY + 36 : 160;
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(12);
  doc.text('Итоговый расчет', pageWidth / 2, totalStartY - 16, { align: 'center' });
  const itemsTotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  // Итог: сумма позиций → скидка → итог со скидкой. total_price в БД уже со скидкой
  const foot: string[][] = [['', '', '', 'Итого', `${formatPrice(itemsTotal)} ₽`]];
  if (discountPercent > 0) {
    foot.push(['', '', '', `Скидка ${discountPercent}%`, `− ${formatPrice(itemsTotal - totalPrice)} ₽`]);
    foot.push(['', '', '', 'Итого со скидкой', `${formatPrice(totalPrice)} ₽`]);
  }
  autoTable(doc, {
    startY: totalStartY,
    head: [['№', 'Товар', 'Кол-во', 'Цена', 'Сумма']],
    body: items.map((item, index) => [
      String(index + 1),
      item.name,
      String(item.qty),
      `${formatPrice(withDiscount(item.price))} ₽`,
      `${formatPrice(withDiscount(item.price) * item.qty)} ₽`
    ]),
    foot,
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
      3: { cellWidth: 86, halign: 'right', textColor: [210, 20, 30] },
      4: { cellWidth: 86, halign: 'right', textColor: [210, 20, 30] }
    }
  });
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(30, 30, 30);
  doc.text(
    doc.splitTextToSize(
      `*Ценовое предложение действует ограниченный срок.${
        DISCOUNT_PERCENT > 0
          ? ` Акция -${DISCOUNT_PERCENT}% не распространяется на отдельные бренды и товары.`
          : ''
      } Перед оформлением обязательно уточняйте конечную стоимость товаров у менеджера.`,
      pageWidth - 80
    ),
    40,
    pageHeight - 34
  );
  doc.save(`commercial-offer-${exportNumber}-${fileDate}.pdf`);
  toast.success(`PDF выгружен. Номер КП: ${exportNumber}`);
}
