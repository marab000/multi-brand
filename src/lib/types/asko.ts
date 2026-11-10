// Тип товара витрины ASKO (общий для /routes/asko и компонентов витрины).
export type AskoProduct = {
	name: string; // наименование из базы
	price: number; // РРЦ в тысячах (конвенция ×1000 при показе)
	stock: number | null;
	group: string; // витринная группа фильтра
	img: string | null; // первая картинка (S3 url, src строит imgUrl)
};
