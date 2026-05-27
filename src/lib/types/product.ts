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
export interface ProductKitItem {
  id: string;
  kit_product_id: string;
  child_product_id: string | null;
  name: string | null;
  brand: string | null;
  description: string | null;
  price_rrc: number | null;
  source_url: string | null;
  preview_image: string | null;
  position: number | null;
  specs: Record<string, any> | null;
  raw: Record<string, any> | null;
  child_product?: Product | null;
  child_slug?: string | null;
  image?: string | null;
}
export interface ProductKitLink {
  id: string;
  name: string;
  slug: string;
  price_rrc: number | null;
  image: string | null;
  brand: {
    name: string;
    api?: string;
    id?: string;
  } | null;
}