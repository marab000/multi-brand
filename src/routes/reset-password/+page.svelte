<script lang="ts">
  import { page } from '$app/stores';
  import { toast } from 'svelte-sonner';

  let password = $state('');
  let password2 = $state('');
  let loading = $state(false);
  let done = $state(false);

  const token = $derived(($page.url.searchParams.get('token') ?? '').trim());
  const min6 = $derived(password.length >= 6);
  const canSubmit = $derived(!!token && min6 && password === password2 && !loading);

  async function submit() {
    if (!canSubmit) return;
    loading = true;
    try {
      const res = await fetch('/api/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        done = true;
      } else {
        toast.error(data.message ?? 'Не удалось изменить пароль');
      }
    } catch {
      toast.error('Ошибка сети — попробуй ещё раз');
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Новый пароль | MULTIBRAND</title>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="reset-page">
  <div class="reset-card">
    {#if !token}
      <h1>Ссылка недействительна</h1>
      <p>В ссылке нет токена сброса. Запроси восстановление пароля заново через форму «Войти».</p>
      <a class="btn primary" href="/?auth=login">К форме входа</a>
    {:else if done}
      <h1>Пароль изменён</h1>
      <p>Теперь войди с новым паролем.</p>
      <a class="btn primary" href="/?auth=login">К форме входа</a>
    {:else}
      <h1>Новый пароль</h1>
      <p>Придумай пароль — минимум 6 символов.</p>
      <form
        onsubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input type="password" placeholder="Новый пароль" bind:value={password} autocomplete="new-password" />
        <input
          type="password"
          placeholder="Повтори пароль"
          bind:value={password2}
          autocomplete="new-password"
          class:invalid={password2.length > 0 && password2 !== password}
        />
        {#if password2.length > 0 && password2 !== password}
          <p class="hint err">Пароли не совпадают</p>
        {/if}
        <button class="btn primary" type="submit" disabled={!canSubmit}>
          {loading ? 'Сохраняем…' : 'Сохранить пароль'}
        </button>
      </form>
    {/if}
  </div>
</div>

<style lang="scss">
  .reset-page {
    display: flex;
    justify-content: center;
    padding: $sp-8 $sp-3;
  }
  .reset-card {
    width: 100%;
    max-width: 420px;
    padding: $sp-4;
    border: 1px solid #eee;
    border-radius: 12px;
    background: #fff;
    h1 {
      margin: 0 0 $sp-2;
      font-size: 1.25rem;
      font-weight: 700;
      color: #111827;
    }
    p {
      margin: 0 0 $sp-3;
      color: #6b7280;
      font-size: 0.875rem;
      line-height: 1.5;
    }
    form {
      display: flex;
      flex-direction: column;
      gap: $sp-2;
      input {
        height: 44px;
        padding: 0 $sp-3;
        border: 1px solid #ddd;
        border-radius: 8px;
        font-size: 0.875rem;
        outline: none;
        &:focus {
          border-color: $green-light;
        }
        &.invalid {
          border-color: $accent-red;
        }
      }
      .hint {
        margin: 0;
        font-size: 0.75rem;
        &.err {
          color: $accent-red;
        }
      }
      .btn {
        height: 44px;
      }
    }
  }
</style>
