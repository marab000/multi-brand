import { supabase } from '$lib/supabaseClient';
import { fail } from '@sveltejs/kit';

export const actions = {
  default: async ({ request }) => {
    const data = await request.formData();

    const email = data.get('email') as string;
    const password = data.get('password') as string;
    const name = data.get('name') as string;
    const phone = data.get('phone') as string;

    if (!email || !password) {
      return fail(400, { error: 'Missing email or password' });
    }

    const { data: result, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, phone }
      }
    });

    if (error) {
      console.error(error);
      return fail(400, { error: error.message });
    }

    return { success: true };
  }
};
