<script lang="ts">
  import { Lock, User } from 'lucide-svelte';
  export let form: { error?: string } | null = null;
</script>

<div class="login-page">
  <form method="POST" class="login-card">
    <div class="brand">
      <div class="brand-mark">A</div>
      <span class="brand-name">ADMIN</span>
    </div>

    <h1>Вход в панель управления</h1>
    <p class="subtitle">Введите учётные данные для доступа</p>

    {#if form?.error}
      <div class="error">{form.error}</div>
    {/if}

    <label class="field">
      <span class="label">Логин</span>
      <div class="input-wrap">
        <User size={18} strokeWidth={2} />
        <input name="login" placeholder="admin" autocomplete="username" required />
      </div>
    </label>

    <label class="field">
      <span class="label">Пароль</span>
      <div class="input-wrap">
        <Lock size={18} strokeWidth={2} />
        <input name="password" type="password" placeholder="••••••••" autocomplete="current-password" required />
      </div>
    </label>

    <button type="submit">Войти</button>
  </form>
</div>

<style lang="scss">
  .login-page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 20px;
    background: radial-gradient(circle at 50% 0%, rgba($green, 0.12), transparent 60%),
      linear-gradient(180deg, #fafafa 0%, #eef1ee 100%);
  }
  .login-card {
    width: 100%;
    max-width: 400px;
    padding: 40px 36px 36px;
    background: #fff;
    border-radius: 20px;
    border: 1px solid #e9ece8;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.06);
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 28px;
  }
  .brand-mark {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: $green;
    color: #fff;
    font-size: 22px;
    font-weight: 800;
  }
  .brand-name {
    font-size: 18px;
    font-weight: 800;
    letter-spacing: 0.06em;
    color: $green;
  }
  h1 {
    margin: 0 0 6px;
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -0.02em;
  }
  .subtitle {
    margin: 0 0 24px;
    font-size: 14px;
    color: #667085;
  }
  .error {
    margin-bottom: 18px;
    padding: 11px 14px;
    border-radius: 10px;
    background: rgba($error, 0.08);
    border: 1px solid rgba($error, 0.25);
    color: $error;
    font-size: 13.5px;
    font-weight: 500;
  }
  .field {
    display: block;
    margin-bottom: 16px;
  }
  .label {
    display: block;
    margin-bottom: 7px;
    font-size: 13px;
    font-weight: 600;
    color: #344054;
  }
  .input-wrap {
    display: flex;
    align-items: center;
    gap: 10px;
    height: 46px;
    padding: 0 14px;
    border-radius: 11px;
    border: 1.5px solid #e4e7ec;
    background: #fff;
    transition: 0.15s;
    :global(svg) {
      color: #98a2b3;
      flex-shrink: 0;
    }
    &:focus-within {
      border-color: $green;
      box-shadow: 0 0 0 3px rgba($green, 0.12);
      :global(svg) {
        color: $green;
      }
    }
  }
  input {
    flex: 1;
    min-width: 0;
    height: 100%;
    border: none;
    background: transparent;
    font-size: 15px;
    color: #1d2939;
    outline: none;
    &::placeholder {
      color: #98a2b3;
    }
  }
  button {
    width: 100%;
    height: 48px;
    margin-top: 8px;
    border: none;
    border-radius: 11px;
    background: $green;
    color: #fff;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    transition: 0.15s;
    &:hover {
      background: color-mix(in srgb, $green 88%, #000);
    }
    &:active {
      transform: scale(0.99);
    }
  }
  @media (max-width: 480px) {
    .login-card {
      padding: 32px 22px 28px;
      border-radius: 16px;
    }
  }
</style>
