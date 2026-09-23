import { sql } from '$lib/db';

const PER_PAGE = 10;

export const load = async ({ url }) => {
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
  const offset = (page - 1) * PER_PAGE;

  const [countRow] = await sql`SELECT count(*)::int as total FROM cart_exports`;
  const total = countRow.total;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  // КП создаёт только авторизованный юзер — показываем создателя (старые записи до авторизации — null)
  const exports = await sql`
    SELECT e.id, e.export_number, e.items, e.total_price, e.discount_percent, e.user_id, e.created_at,
           u.email as user_email, u.full_name as user_name
    FROM cart_exports e
    LEFT JOIN users u ON u.id = e.user_id
    ORDER BY e.created_at DESC
    LIMIT ${PER_PAGE} OFFSET ${offset}
  `;

  return { exports, page, totalPages, total };
};
