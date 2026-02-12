<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { toast } from 'svelte-sonner';

  export let open = false;
  export let mode: 'login' | 'register' = 'login';

  const dispatch = createEventDispatcher();

  let email = '';
  let phone = '';
  let password = '';
  let fullName = '';
  let loading = false;

  async function handleAuth() {
    loading = true;

    try {
      // ================= LOGIN =================
      if (mode === 'login') {
        const loginValue = email.trim(); // тут email или телефон

        // если ввели телефон — ищем email
        let loginEmail = loginValue;

        // if (/^\+?\d+$/.test(loginValue)) {
        //   const { data } = await supabase
        //     .from('users')
        //     .select('email')
        //     .eq('phone_number', loginValue)
        //     .single();

        //   if (!data?.email) {
        //     toast.error('Телефон не найден');
        //     return;
        //   }

        //   loginEmail = data.email;
        // }

        // const { error } = await supabase.auth.signInWithPassword({
        //   email: loginEmail,
        //   password
        // });

        // if (error) throw error;

        toast.success('Вы вошли');
      }

      // ================= REGISTER =================
      if (mode === 'register') {
        if (!fullName || !email || !phone || !password) {
          toast.error('Заполни все поля');
          return;
        }

        // const { data, error } = await supabase.auth.signUp({
        //   email,
        //   password,
        //   phone,
        //   options: {
        //     data: {
        //       full_name: fullName,
        //       phone_number: phone
        //     }
        //   }
        // });

        // if (error) throw error;

        toast.success('Проверь почту для подтверждения');
      }

      dispatch('success');
      open = false;
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      loading = false;
    }
  }
</script>

{#if open}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <button class="absolute h-full w-full opacity-0" on:click={() => (open = false)}>''</button>
    <div class="relative w-96 rounded-xl bg-white p-6">
      <h2 class="mb-4 text-xl font-bold">
        {mode === 'login' ? 'Вход' : 'Регистрация'}
      </h2>

      {#if mode === 'register'}
        <input class="mb-2 w-full border p-2" placeholder="Имя" bind:value={fullName} />
        <input class="mb-2 w-full border p-2" placeholder="Телефон" bind:value={phone} />
        <input class="mb-2 w-full border p-2" placeholder="Email" bind:value={email} />
      {/if}

      {#if mode === 'login'}
        <input class="mb-2 w-full border p-2" placeholder="Email или телефон" bind:value={email} />
      {/if}

      <input
        class="mb-2 w-full border p-2"
        type="password"
        placeholder="Пароль"
        bind:value={password}
      />

      <button
        class="w-full rounded bg-black px-4 py-2 text-white"
        disabled={loading}
        on:click={handleAuth}
      >
        {loading ? '...' : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
      </button>

      <button class="mt-2 text-sm" on:click={() => (open = false)}>Закрыть</button>
    </div>
  </div>
{/if}
