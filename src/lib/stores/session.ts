import { writable } from 'svelte/store';
import { supabase } from '$lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';
//ts fix
export const session = writable<Session | null>(null);

supabase.auth.getSession().then(({ data }) => {
  session.set(data.session);
});

supabase.auth.onAuthStateChange((_event, s) => {
  session.set(s);
});
