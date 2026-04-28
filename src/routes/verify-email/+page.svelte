<script lang="ts">
  import type { PageData } from './$types';
  import { CircleCheck, Mail, CircleX } from 'lucide-svelte';

  export let data: PageData;
</script>

<div class="verify-email container mx-auto">
  <div class="verify-email__card">
    <div
      class="verify-email__icon"
      class:success={data.status === 'success'}
      class:error={data.status === 'error'}
    >
      {#if data.status === 'success'}
        <CircleCheck size="34" />
      {:else if data.status === 'error'}
        <CircleX size="34" />
      {:else}
        <Mail size="34" />
      {/if}
    </div>
    <h1>{data.title}</h1>
    <p>{data.message}</p>
    <a class="btn primary" href="/">На главную</a>
  </div>
</div>

<style lang="scss">
  .verify-email {
    display: flex;
    justify-content: center;
    padding-top: 60px;
    padding-bottom: 60px;
    &__card {
      width: 100%;
      max-width: 460px;
      display: grid;
      justify-items: center;
      gap: 14px;
      padding: 32px;
      border: 1px solid #eee;
      border-radius: 20px;
      background: #fff;
      text-align: center;
      box-shadow: 0 18px 50px rgba(0, 0, 0, 0.06);
      h1 {
        margin: 0;
        font-size: 28px;
        font-weight: 800;
      }
      p {
        max-width: 360px;
        margin: 0;
        color: #666;
        line-height: 1.5;
      }
      a {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-top: 8px;
        text-decoration: none;
      }
    }
    &__icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 64px;
      height: 64px;
      border-radius: 999px;
      background: rgba($yellow, 0.14);
      color: $yellow;
      &.success {
        background: rgba($green, 0.1);
        color: $green;
      }
      &.error {
        background: rgba(255, 0, 0, 0.08);
        color: rgba(220, 0, 0, 0.85);
      }
    }
  }
</style>
