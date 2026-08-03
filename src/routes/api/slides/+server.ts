import { json } from '@sveltejs/kit';
import { sql } from '$lib/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  try {
    const slides = await sql`
      SELECT desktop_url, mobile_url FROM slides
      WHERE is_active = true
      ORDER BY position ASC, id ASC
    `;
    const desktopSlides = slides.map((s) => s.desktop_url);
    const mobileSlides = slides.map((s) => s.mobile_url);
    return json({ desktop: desktopSlides, mobile: mobileSlides });
  } catch (e) {
    console.error('Slides GET error:', e);
    return json({ desktop: [], mobile: [] });
  }
};
