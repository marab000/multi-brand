<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';
  import { toast } from 'svelte-sonner';

  export let data: PageData;
  export let form: ActionData;

  $: if (form?.success) toast.success('Данные обновлены');
  $: if (form?.message) toast.error(form.message);
</script>

<div class="account-info">
  <h2>Мои данные</h2>
  <form method="POST" action="?/update" use:enhance>
    <label>
      <span>Имя</span>
      <input name="fullName" value={data.user?.full_name ?? ''} />
    </label>
    <label>
      <span>Телефон</span>
      <input name="phone" value={data.user?.phone ?? ''} />
    </label>
    <label>
      <span>Email</span>
      <input value={data.user?.email ?? ''} disabled />
    </label>
    <button type="submit">Сохранить</button>
  </form>
</div>

<style lang="scss">
  .account-info {
    padding: 22px;
    border: 1px solid #eee;
    border-radius: 16px;
    background: #fff;
    h2 {
      margin: 0 0 18px;
      font-size: 24px;
      font-weight: 700;
    }
    form {
      display: grid;
      gap: 14px;
      max-width: 460px;
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
</style>
