export interface Product {
  id: string;
  external_id: string;
  name: string;
  description: string | null;
  brand: {
    name: string;
    api?: string;
    id?: string;
  } | null;
  category: string | null;
  product_type: string | null;
  catalog_root_slug: string | null;
  catalog_root_name: string | null;
  catalog_group_slug: string | null;
  catalog_group_name: string | null;
  catalog_leaf_slug: string | null;
  catalog_leaf_name: string | null;
  price_rrc: number | null;
  price_opt: number | null;
  price_ric: number | null;
  specs: Record<string, any> | null;
  raw: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  images?: {
    url: string;
    position: number;
  }[];
}
