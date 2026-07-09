import { sql } from '$lib/db';

const PER_PAGE = 10;

export const load = async ({ url }) => {
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
  const offset = (page - 1) * PER_PAGE;

  const [countRow] = await sql`SELECT count(*)::int as total FROM orders`;
  const total = countRow.total;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  const orders = await sql`
    SELECT * FROM orders ORDER BY created_at DESC LIMIT ${PER_PAGE} OFFSET ${offset}
  `;

  return { orders, page, totalPages, total };
};
