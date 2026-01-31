import { SvelteKitAuth } from '@auth/sveltekit';
import Credentials from '@auth/core/providers/credentials';
import { supabase } from '$lib/supabaseClient';

export const { handle, signIn, signOut } = SvelteKitAuth({
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {}
				// 
      },
      async authorize(credentials) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: credentials.email as string,
          password: credentials.password as string,
        });

        if (error || !data.user) return null;
        return data.user;
      }
    })
  ]
});
