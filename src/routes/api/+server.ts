import { supabase } from '$lib/supabaseClient';
import { json } from '@sveltejs/kit';

export async function POST({ request }) {
  const { phone, password } = await request.json();

  const { data: user } = await supabase
    .from('users')
    .select('email')
    .eq('phone_number', phone)
    .single();

  if (!user) return json({ error: 'User not found' }, { status: 404 });

  const { error } = await supabase.auth.signInWithPassword({
    email: user.email,
    password
  });

  if (error) return json({ error: error.message }, { status: 401 });

  return json({ success: true });
}
