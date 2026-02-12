export async function fetchProducts(params: {
  brand?: string
  category?: string
  type?: string
}) {
  const query = new URLSearchParams(params as any).toString()
  const res = await fetch(`/api/products?${query}`)
  return res.json()
}

export async function fetchCatalogTree() {
  const res = await fetch('/api/catalog-tree')
  return res.json()
}
