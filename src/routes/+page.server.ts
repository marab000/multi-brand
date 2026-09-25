import type { PageServerLoad } from './$types';
import { sql } from '$lib/db';

export const load: PageServerLoad = async ({ fetch }) => {
  try {
    const res = await fetch('/api/slides');
    const data = await res.json();

    // Последние 3 статьи для секции на главной
    let latestArticles: any[] = [];
    try {
      latestArticles = await sql`
        SELECT id, slug, title, description, cover_url, created_at
        FROM articles
        WHERE is_published = true
        ORDER BY created_at DESC
        LIMIT 3
      `;
    } catch {
      // таблицы ещё нет
    }

    return {
      desktopSlides: data.desktop || [],
      mobileSlides: data.mobile || [],
      latestArticles
    };
  } catch {
    return { desktopSlides: [], mobileSlides: [], latestArticles: [] };
  }
};
