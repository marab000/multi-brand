import type { RequestHandler } from './$types';
import postgres from 'postgres';
import { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } from '$env/static/private';

console.log('ENV CHECK:', {
  DB_HOST: DB_HOST,
  DB_PORT: DB_PORT,
  DB_NAME: DB_NAME,
  DB_USER: DB_USER,
  DB_PASSWORD: DB_PASSWORD
});

// создаём подключение
const sql = postgres({
  host: DB_HOST || 'localhost',
  port: Number(DB_PORT || 5432),
  database: DB_NAME,
  user: DB_USER,
  password: DB_PASSWORD
});

export const GET: RequestHandler = async ({ url }) => {
  try {
    const brand = url.searchParams.get('brand');
    const category = url.searchParams.get('category');
    const type = url.searchParams.get('type');
    const search = url.searchParams.get('search');

    let query = sql`
      SELECT *
      FROM products
      WHERE 1=1
    `;

    if (brand) {
      query = sql`${query} AND brand_name ILIKE ${'%' + brand + '%'}`;
    }

    if (category) {
      query = sql`${query} AND category = ${category}`;
    }

    if (type) {
      query = sql`${query} AND product_type = ${type}`;
    }

    if (search) {
      query = sql`${query} AND name ILIKE ${'%' + search + '%'}`;
    }

    const products = await query;

    return new Response(JSON.stringify(products), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('DB ERROR:', error);

    return new Response(JSON.stringify({ error: 'Database error', details: String(error) }), {
      status: 500
    });
  }
};
