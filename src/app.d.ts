declare global {
  namespace App {
    interface Locals {
      user: {
        id: number;
        email: string;
        phone: string | null;
        full_name: string;
        email_verified: boolean;
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
