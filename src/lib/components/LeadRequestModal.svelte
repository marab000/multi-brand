<script lang="ts">
  import { X, Send } from 'lucide-svelte';
  import { toast } from 'svelte-sonner';
  import { apiFetch } from '$lib/api';
  import { phoneMask } from '$lib/actions/phoneMask';
  import { isValidRuPhone, normalizeRuPhone } from '$lib/utils/phone';
  let { open = $bindable(false) } = $props<{ open?: boolean }>();
  let name = $state('');
  let phone = $state('');
  let message = $state('');
  let agree = $state(false);
  let loading = $state(false);
  const reachGoal = (goal: string) => {
    if (typeof window === 'undefined') return;
    window.ym?.(108518016, 'reachGoal', goal);
  };
  const close = () => {
    if (loading) return;
    open = false;
  };
  const submit = async () => {
    if (!name.trim()) {
      toast.error('Введите имя');
      return;
    }
    if (!isValidRuPhone(phone)) {
      toast.error('Введите корректный номер телефона');
      return;
    }
    if (!agree || loading) return;
    loading = true;
    try {
      await apiFetch(fetch, '/api/leads', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          phone: normalizeRuPhone(phone),
          message: message.trim()
        }),
        headers: { 'Content-Type': 'application/json' }
      });
      reachGoal('lead_submit');
      toast.success('Заявка отправлена');
      open = false;
      name = '';
      phone = '';
      message = '';
      agree = true;
    } catch {
      toast.error('Не удалось отправить заявку');
    } finally {
      loading = false;
    }
  };
</script>

{#if open}
  <button class="overlay" type="button" aria-label="Закрыть форму" onclick={close}></button>
  <div class="modal" role="dialog" aria-modal="true">
    <button class="close" type="button" aria-label="Закрыть" onclick={close}
      ><X size={22} strokeWidth={2.1} /></button
    >
    <h3>Оставьте заявку</h3>
    <p>Мы свяжемся с вами в ближайшее время</p>
    <form
      onsubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <input
        class="input primary"
        bind:value={name}
        type="text"
        placeholder="Ваше имя"
        autocomplete="name"
        disabled={loading}
      />
      <div class="with-prefix">
        <span class="prefix">+7</span>
        <input
          class="input primary"
          type="tel"
          placeholder="999 123 45 67"
          autocomplete="tel"
          inputmode="numeric"
          value={phone}
          use:phoneMask={{ value: phone, onAccept: (digits) => (phone = digits) }}
          disabled={loading}
        />
      </div>
      <textarea
        class="input primary"
        bind:value={message}
        placeholder="Расскажите о задаче (необязательно)"
        disabled={loading}
      ></textarea>
      <label class="checkbox secondary">
        <input bind:checked={agree} type="checkbox" disabled={loading} />
        <span class="box"></span>
        <span class="text">Я согласен на обработку персональных данных</span>
      </label>
      <button class="btn primary submit" type="submit" disabled={!agree || loading}
        ><Send size={19} strokeWidth={2.2} /><span
          >{loading ? 'Отправляем...' : 'Отправить заявку'}</span
        ></button
      >
    </form>
  </div>
{/if}

<style lang="scss">
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    border: 0;
    background: rgba(15, 23, 42, 0.38);
    backdrop-filter: blur(8px);
  }
  .modal {
    position: fixed;
    top: 50%;
    left: 50%;
    z-index: 1001;
    width: min(496px, calc(100vw - 32px));
    padding: 28px;
    border: 1px solid rgba($green, 0.14);
    border-radius: 24px;
    background: #fff;
    color: #171717;
    box-shadow: 0 30px 90px rgba(15, 23, 42, 0.24);
    transform: translate(-50%, -50%);
    @media (max-width: 640px) {
      padding: 22px;
      border-radius: 20px;
    }
    .close {
      position: absolute;
      top: 18px;
      right: 18px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 38px;
      height: 38px;
      border: 0;
      border-radius: 12px;
      background: #f3f5f4;
      color: #475569;
      cursor: pointer;
      transition:
        background 0.18s ease,
        color 0.18s ease;
      &:hover {
        background: rgba($green, 0.08);
        color: $green;
      }
    }
    h3 {
      margin: 0;
      padding-right: 44px;
      color: #171717;
      font-size: 28px;
      line-height: 1.08;
      font-weight: 800;
      letter-spacing: -0.04em;
    }
    p {
      margin: 8px 0 20px;
      color: #64748b;
      font-size: 15px;
      line-height: 1.45;
    }
    form {
      display: grid;
      gap: 12px;
    }
    textarea.input {
      min-height: 96px;
      height: 96px;
      padding-top: 15px;
      resize: vertical;
    }
    .submit {
      gap: 10px;
      width: 100%;
      height: 56px;
      border-radius: 16px;
      font-size: 15px;
      font-weight: 800;
      &:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
    }
  }
</style>
