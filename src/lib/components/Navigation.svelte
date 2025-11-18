<script>
	import { createEventDispatcher } from 'svelte';

	export let currentScreen = 'home';

	const dispatch = createEventDispatcher();

	const items = [
		{ id: 'home', label: '홈', activeIcon: '🏠', icon: '🏡' },
		{ id: 'payment', label: '결제', activeIcon: '💳', icon: '💰' },
		{ id: 'history', label: '거래내역', activeIcon: '📜', icon: '🧾' }
	];

	function navigate(screen) {
		dispatch('navigate', screen);
	}
</script>

<nav class="flex items-center justify-around border-t border-gray-200 bg-white px-4 py-3 shadow-lg">
	{#each items as item (item.id)}
		<button
			on:click={() => navigate(item.id)}
			class="flex flex-col items-center gap-1 rounded-xl px-4 py-2 text-xs font-semibold transition-colors {currentScreen ===
			item.id
				? 'text-cyan-600'
				: 'text-gray-500'}"
		>
			<span class="text-2xl">{currentScreen === item.id ? item.activeIcon : item.icon}</span>
			<span>{item.label}</span>
		</button>
	{/each}
</nav>

<style>
	button {
		border: none;
		background: none;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	button:active {
		transform: scale(0.95);
	}
</style>
