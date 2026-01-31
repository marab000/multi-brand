<script lang="ts">
  export let open = false;
  export let mode: 'login' | 'register' = 'login';
  export let error: string | null = null;

  function close() {
    open = false;
  }
</script>

{#if open}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-xl font-semibold">
          {mode === 'login' ? 'Вход' : 'Регистрация'}
        </h2>
        <button on:click={close} class="text-slate-400 hover:text-black">✕</button>
      </div>

      <form
        method="POST"
        action={mode === 'login' ? '/login' : '/register'}
        class="space-y-4"
      >
        {#if error}
          <div class="rounded-lg bg-red-50 p-2 text-sm text-red-600">
            {error}
          </div>
        {/if}

        {#if mode === 'register'}
          <input name="name" placeholder="Имя" required class="input" />
          <input name="phone" placeholder="Телефон" required class="input" />
        {/if}

        <input name="email" type="email" placeholder="Email" required class="input" />
        <input
          name="password"
          type="password"
          placeholder="Пароль"
          required
          class="input"
        />

        {#if mode === 'register'}
          <label class="flex items-center gap-2 text-sm">
            <input type="checkbox" name="captcha" required />
            Я не робот
          </label>
        {/if}

        <button type="submit" class="btn-primary">
          {mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
        </button>
      </form>
    </div>
  </div>
{/if}

<style>
  .input {
    width: 100%;
    border-radius: 0.5rem;
    border: 1px solid #e5e7eb;
    padding: 0.5rem 0.75rem;
  }
  .btn-primary {
    width: 100%;
    border-radius: 0.5rem;
    background: black;
    padding: 0.5rem;
    color: white;
  }
</style>
