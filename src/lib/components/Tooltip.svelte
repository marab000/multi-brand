<script lang="ts">
	import { fly } from 'svelte/transition';

	// Клик-тултип: всплывашка над триггером. Клик по триггеру — открыть/закрыть,
	// клик мимо и Esc — закрыть. text — подсказка, children — содержимое триггера.
	let { text = '', children } = $props();

	let open = $state(false);
	let root: HTMLSpanElement | undefined = $state();

	function toggle() {
		open = !open;
	}

	function onDocClick(e: MouseEvent) {
		if (root && !root.contains(e.target as Node)) open = false;
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') open = false;
	}

	$effect(() => {
		document.addEventListener('click', onDocClick);
		document.addEventListener('keydown', onKeydown);
		return () => {
			document.removeEventListener('click', onDocClick);
			document.removeEventListener('keydown', onKeydown);
		};
	});
</script>

<span class="tooltip" bind:this={root}>
	<span
		class="tooltip__trigger"
		class:tooltip__trigger--on={open}
		role="button"
		tabindex="0"
		aria-expanded={open}
		onclick={toggle}
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				toggle();
			}
		}}
	>
		{@render children?.()}
	</span>
	{#if open}
		<span class="tooltip__bubble" role="tooltip" transition:fly={{ y: 4, duration: 120 }}>
			{text}
		</span>
	{/if}
</span>

<style lang="scss">
	.tooltip {
		position: relative;
		display: inline-flex;
	}
	.tooltip__trigger {
		display: inline-flex;
		cursor: help;
		border: none;
		background: none;
		padding: 0;
		text-align: left;
		&:focus-visible {
			outline: 0.125rem solid $green;
			outline-offset: 0.125rem;
			border-radius: 0.625rem;
		}
		&--on {
			background: #f1f5f9;
			border-radius: 0.625rem;
		}
	}
	.tooltip__bubble {
		position: absolute;
		bottom: calc(100% + 0.5rem);
		left: 50%;
		transform: translateX(-50%);
		z-index: 50;
		width: max-content;
		max-width: 16.25rem;
		padding: 0.5rem 0.625rem;
		border-radius: 0.5rem;
		background: #0f172a;
		color: #f8fafc;
		font-size: 0.75rem;
		line-height: 1.45;
		text-align: left;
		white-space: normal;
		box-shadow: 0 0.375rem 1.25rem rgba(15, 23, 42, 0.25);
		pointer-events: none;
		&::after {
			content: '';
			position: absolute;
			top: 100%;
			left: 50%;
			transform: translateX(-50%);
			border: 0.3125rem solid transparent;
			border-top-color: #0f172a;
		}
	}
</style>
