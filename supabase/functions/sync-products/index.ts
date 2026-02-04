import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

// helpers
function getFieldLike(obj: Record<string, any>, keyPart: string) {
  if (!obj) return null;
  const key = Object.keys(obj).find(k =>
    k.toLowerCase().includes(keyPart.toLowerCase())
  );
  return key ? obj[key] : null;
}

function toNumber(val: any): number | null {
  if (!val) return null;
  const cleaned = String(val).replace(',', '.').replace(/[^\d.]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// env
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const API_KEY = Deno.env.get("TETRAIS_API_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const BRANDS = ["6102502"];

serve(async () => {
  try {
    for (const brandId of BRANDS) {
      const url = `https://tetrasis-bt.ru/download/${API_KEY}/${brandId}/0/`;
      const res = await fetch(url);
      const text = await res.text();
      const data = JSON.parse(text);

      for (const item of data) {
        const extras = item["ДопРеквизиты"] || {};

        const width = getFieldLike(extras, "Ширина");
        const height = getFieldLike(extras, "Высота");
        const length = getFieldLike(extras, "Глубина");

        await supabase.from("products").upsert(
          {
            external_id: item.ID,
            brand_id: brandId,
            name: item["РабочееНаименование"],
            sku: item["Артикул"],
            description: item["ТекстовоеОписание"],
            category: item["ГруппаАналитическогоУчета"],
            product_type: item["ЦеноваяГруппа"],

            color: extras["Цвет"] ?? null,
            weight: toNumber(item["Вес"]),
            width: toNumber(width),
            height: toNumber(height),
            length: toNumber(length),

            raw: item
          },
          { onConflict: "external_id" }
        );
      }
    }

    return new Response("SYNC OK");
  } catch (e) {
    return new Response("ERROR: " + e.message, { status: 500 });
  }
});
