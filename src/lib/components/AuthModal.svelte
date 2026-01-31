<script lang="ts">
  import { supabase } from '$lib/supabaseClient';
  import { createEventDispatcher } from 'svelte';

  export let open = false;
  export let mode: 'login' | 'register' = 'login';

  const dispatch = createEventDispatcher();

  let email = '';
  let password = '';
  let loading = false;
  let errorMsg = '';

  async function handleAuth() {
    loading = true;
    errorMsg = '';

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) errorMsg = error.message;
    }

    if (mode === 'register') {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) errorMsg = error.message;
    }

    loading = false;

    if (!errorMsg) {
      dispatch('success');
      open = false;
    }
  }
</script>

{#if open}
<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
  <div class="bg-white p-6 rounded-xl w-96">
    <h2 class="text-xl font-bold mb-4">
      {mode === 'login' ? 'Login' : 'Register'}
    </h2>

    <input
      class="border p-2 w-full mb-2"
      placeholder="Email"
      bind:value={email}
    />

    <input
      class="border p-2 w-full mb-2"
      type="password"
      placeholder="Password"
      bind:value={password}
    />

    {#if errorMsg}
      <p class="text-red-500 text-sm">{errorMsg}</p>
    {/if}

    <button
      class="bg-black text-white px-4 py-2 rounded w-full"
      disabled={loading}
      on:click={handleAuth}
    >
      {loading ? '...' : mode === 'login' ? 'Login' : 'Register'}
    </button>

    <button class="text-sm mt-2" on:click={() => (open = false)}>
      Close
    </button>
  </div>
</div>
{/if}
