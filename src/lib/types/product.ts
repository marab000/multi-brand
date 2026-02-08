export interface Product {
  ID: string;
  РабочееНаименование: string;
  Активность: string;
  ТекстовоеОписание: string;
  ВидНоменклатуры: string;
  Марка: string;
  Артикул?: string;
  Штрихкод?: string;
  Вес?: string;
  Объем?: string;
  СтавкаНДС?: string;
  ГруппаСписка?: string;
  ЦеноваяГруппа?: string;
  ДопРеквизиты?: Record<string, string>;
}
