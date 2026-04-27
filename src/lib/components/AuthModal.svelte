<script lang="ts">
  import { createEventDispatcher, onDestroy, tick } from 'svelte';
  import { toast } from 'svelte-sonner';
  import IMask from 'imask';

  export let open = false;
  export let mode: 'login' | 'register' = 'login';

  const dispatch = createEventDispatcher<{ success: void; close: void }>();

  let login = '';
  let email = '';
  let password = '';
  let fullName = '';
  let loading = false;
  let phoneInput: HTMLInputElement;
  let mask: any = null;

  $: if (open && mode === 'register') initPhoneMask();

  async function initPhoneMask() {
    await tick();
    if (phoneInput && !mask) {
      mask = IMask(phoneInput, {
        mask: '000 000 00 00',
        lazy: true
      });
    }
  }

  function destroyPhoneMask() {
    if (!mask) return;
    mask.destroy();
    mask = null;
  }

  function close() {
    open = false;
    destroyPhoneMask();
    dispatch('close');
  }

  function switchMode(next: 'login' | 'register') {
    mode = next;
    password = '';
    if (next === 'login') destroyPhoneMask();
  }

  function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  function isValidPhone() {
    const digits = mask?.unmaskedValue || '';
    return digits.length === 10 && digits.startsWith('9');
  }

  async function handleAuth() {
    if (loading) return;
    if (mode === 'login') {
      if (!login.trim() || !password) {
        toast.error('Введите email или телефон и пароль');
        return;
      }
    }
    if (mode === 'register') {
      if (!fullName.trim() || !email.trim() || !password) {
        toast.error('Заполни все поля');
        return;
      }
      if (!isValidEmail(email)) {
        toast.error('Введите корректный email');
        return;
      }
      if (!mask || !isValidPhone()) {
        toast.error('Введите корректный номер телефона');
        return;
      }
      if (password.length < 6) {
        toast.error('Пароль должен быть минимум 6 символов');
        return;
      }
    }
    loading = true;
    try {
      const url = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload =
        mode === 'login'
          ? { login, password }
          : {
              fullName: fullName.trim(),
              email: email.trim(),
              phone: `+7${mask.unmaskedValue}`,
              password
            };
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Ошибка авторизации');
      toast.success(mode === 'login' ? 'Вы вошли' : 'Вы зарегистрировались');
      dispatch('success');
      close();
      location.reload();
    } catch (e: any) {
      toast.error(e.message || 'Ошибка авторизации');
    } finally {
      loading = false;
    }
  }

  onDestroy(destroyPhoneMask);
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="auth-overlay" on:click={close}>
    <div class="auth-modal" on:click|stopPropagation>
      <button class="auth-close" type="button" on:click={close}>×</button>
      <h2>{mode === 'login' ? 'Вход' : 'Регистрация'}</h2>
      {#if mode === 'register'}
        <input class="input primary" placeholder="Имя" bind:value={fullName} autocomplete="name" />
        <div class="with-prefix">
          <span class="prefix">+7</span>
          <input
            class="input primary"
            placeholder="999 123 45 67"
            bind:this={phoneInput}
            autocomplete="tel"
            inputmode="numeric"
          />
        </div>
        <input class="input primary" placeholder="Email" bind:value={email} autocomplete="email" />
      {:else}
        <input class="input primary" placeholder="Email" bind:value={login} autocomplete="email" />
      {/if}
      <input
        class="input primary"
        type="password"
        placeholder="Пароль"
        bind:value={password}
        autocomplete={mode === 'login' ? 'current-password' : 'new-password'}
        on:keydown={(e) => e.key === 'Enter' && handleAuth()}
      />
      <button class="btn primary" type="button" disabled={loading} on:click={handleAuth}
        >{loading ? '...' : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}</button
      >
      {#if mode === 'login'}
        <button
          class="btn secondary-with-border"
          type="button"
          on:click={() => switchMode('register')}>Нет аккаунта? Зарегистрироваться</button
        >
      {:else}
        <button class="btn secondary-with-border" type="button" on:click={() => switchMode('login')}
          >Уже есть аккаунт? Войти</button
        >
      {/if}
    </div>
  </div>
{/if}

<style lang="scss">
  .auth-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    background: rgba(0, 0, 0, 0.45);
  }
  .auth-modal {
    position: relative;
    width: 100%;
    max-width: 380px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 24px;
    border-radius: 18px;
    background: #fff;
    box-shadow: 0 18px 60px rgba(0, 0, 0, 0.18);
    h2 {
      margin: 0 0 6px;
      font-size: 22px;
      font-weight: 700;
    }
  }
  .auth-close {
    position: absolute;
    top: 12px;
    right: 14px;
    width: 28px;
    height: 28px;
    border: 0;
    background: transparent;
    font-size: 26px;
    line-height: 1;
    cursor: pointer;
  }
</style>
