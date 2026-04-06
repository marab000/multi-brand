<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  export let open = false;
  export let text = '';
  const dispatch = createEventDispatcher();
  const close = () => dispatch('close');
</script>

{#if open}
  <div class="overlay" on:click={close}>
    <div class="modal" on:click|stopPropagation>
      <p>{text}</p>
      <button on:click={close}>Понятно</button>
    </div>
  </div>
{/if}

<style lang="scss">
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.2s ease;
  }
  .modal {
    background: #fff;
    padding: 20px;
    border-radius: 14px;
    width: 320px;
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 16px;
    transform: translateY(10px);
    animation: scaleIn 0.2s ease forwards;
    p {
      font-size: 14px;
    }
    button {
      background: $green-light;
      color: #fff;
      height: 42px;
      border-radius: 10px;
    }
  }
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  @keyframes scaleIn {
    from {
      opacity: 0;
      transform: translateY(20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
</style>
