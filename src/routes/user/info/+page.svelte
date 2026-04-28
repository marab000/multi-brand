<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';
  import { toast } from 'svelte-sonner';
  import { phoneMask } from '$lib/actions/phoneMask';
  import { getPhoneLocalDigits } from '$lib/utils/phone';
  import { Check } from 'lucide-svelte';

  export let data: PageData;
  export let form: ActionData;

  let fullName = data.user?.full_name ?? '';
  let phone = getPhoneLocalDigits(data.user?.phone);
  let shownSuccess = false;
  let shownMessage = '';
  let sendingVerification = false;

  $: if (form?.user) {
    fullName = form.user.full_name ?? '';
    phone = getPhoneLocalDigits(form.user.phone);
  }

  $: if (form?.success && !shownSuccess) {
    shownSuccess = true;
    toast.success('Данные обновлены');
  }

  $: if (form?.message && form.message !== shownMessage) {
    shownMessage = form.message;
    toast.error(form.message);
  }

  async function resendVerification() {
    if (sendingVerification) return;
    sendingVerification = true;
    try {
      const res = await fetch('/api/auth/resend-verification', { method: 'POST' });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.message || 'Не удалось отправить письмо');
      toast.success('Письмо отправлено');
    } catch (e: any) {
      toast.error(e.message || 'Не удалось отправить письмо');
    } finally {
      sendingVerification = false;
    }
  }
</script>

<div class="account-info">
  <h2>Аккаунт</h2>
  <form
    method="POST"
    action="?/update"
    use:enhance={() => {
      shownSuccess = false;
      shownMessage = '';
      return async ({ update }) => {
        await update({ reset: false, invalidateAll: true });
      };
    }}
  >
    <label>
      <span>Имя</span>
      <input name="fullName" bind:value={fullName} />
    </label>
    <label>
      <span>Телефон</span>
      <div class="with-prefix">
        <span class="prefix">+7</span>
        <input
          class="input primary"
          placeholder="999 123 45 67"
          autocomplete="tel"
          inputmode="numeric"
          name="phone"
          value={phone}
          use:phoneMask={{ value: phone, onAccept: (digits) => (phone = digits) }}
        />
      </div>
    </label>
    <label>
      <span>Email</span>
      <input value={data.user?.email ?? ''} disabled />
      <div class="email-status">
        {#if data.user?.email_verified}
          <span class="email-status__verified flex gap-1"
            >Почта подтверждена <Check size="16"></Check></span
          >
        {:else}
          <span class="email-status__warning">Почта не подтверждена</span>
          <button
            class="email-status__button"
            type="button"
            disabled={sendingVerification}
            on:click={resendVerification}
          >
            {sendingVerification ? 'Отправляем...' : 'Подтвердить'}
          </button>
        {/if}
      </div>
    </label>
    <button type="submit">Сохранить</button>
  </form>
</div>

<style lang="scss">
  .account-info {
    h2 {
      margin: 18px 0;
      font-size: 24px;
      font-weight: 700;
    }
    form {
      display: grid;
      gap: 14px;
      max-width: 460px;
      padding: 22px;
      border: 1px solid #eee;
      border-radius: 16px;
      background: #fff;
    }
    label {
      display: grid;
      gap: 6px;
      span {
        font-size: 14px;
        color: #555;
      }
    }
    input {
      height: 44px;
      padding: 0 12px;
      border: 1px solid #ddd;
      border-radius: 10px;
      outline: none;
      &:focus {
        border-color: $green;
      }
      &:disabled {
        background: #f6f6f6;
        color: #777;
      }
    }
    button {
      width: fit-content;
      height: 42px;
      padding: 0 18px;
      border-radius: 10px;
      background: $green-light;
      color: #fff;
    }
  }
  .email-status {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 2px;
    font-size: 13px;
    &__verified {
      color: $green !important;
      font-weight: 600;
    }
    &__warning {
      color: #b77900;
      font-weight: 600;
    }
    &__button {
      height: 30px !important;
      padding: 0 12px !important;
      border: 1px solid rgba($yellow, 0.7);
      border-radius: 999px !important;
      background: rgba($yellow, 0.08) !important;
      color: #222 !important;
      font-size: 12px;
      font-weight: 700;
      &:hover:not(:disabled) {
        background: rgba($yellow, 0.18) !important;
      }
      &:disabled {
        opacity: 0.7;
        pointer-events: none;
      }
    }
  }
</style>
