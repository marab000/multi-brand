declare global {
  namespace App {
    interface Locals {
      // город поддомена (msk. = Москва, ufa. = Уфа, основной домен = Казань)
      city: string;
      // origin для канониклов/ссылок: на городском поддомене — сам поддомен,
      // на основном домене и в dev — SITE_URL
      siteOrigin: string;
      user: {
        id: number;
        email: string;
        phone: string | null;
        full_name: string;
        email_verified: boolean;
        roles: string[];
      } | null;
      session: {
        id: string;
        expires_at: string;
      } | null;
    }
  }
  interface Window {
    ym?: (counterId: number, method: 'reachGoal', goal: string) => void;
  }
}
export {};
