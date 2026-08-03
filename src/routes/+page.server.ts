import type { PageServerLoad } from './$types';
import { sql } from '$lib/db';

export const load: PageServerLoad = async ({ fetch }) => {
  try {
    const res = await fetch('/api/slides');
    const data = await res.json();
    return {
      desktopSlides: data.desktop || [],
      mobileSlides: data.mobile || []
    };
  } catch {
    return { desktopSlides: [], mobileSlides: [] };
  }
};
