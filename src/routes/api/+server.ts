import type { RequestHandler } from './$types'
import postgres from 'postgres'

const sql = postgres({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  user: process.env.DB_USER,,
})

export const GET: RequestHandler = async ({ url }) => {
  const brand = url.searchParams.get('brand')
  const category = url.searchParams.get('category')
  const type = url.searchParams.get('type')
  const search = url.searchParams.get('search')

  let query = sql`
    SELECT *
    FROM products
    WHERE 1=1
  `

  if (brand) {
    query = sql`${query} AND brand_name = ${brand}`
  }

  if (category) {
    query = sql`${query} AND category = ${category}`
  }

  if (type) {
    query = sql`${query} AND product_type = ${type}`
  }

  if (search) {
    query = sql`${query} AND name ILIKE ${'%' + search + '%'}`
  }

  const products = await query

  return new Response(JSON.stringify(products), {
    headers: { 'Content-Type': 'application/json' }
  })
}
