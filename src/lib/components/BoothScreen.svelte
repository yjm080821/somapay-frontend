<script>
	import { createEventDispatcher } from 'svelte';

	export let booths = [];

	const dispatch = createEventDispatcher();

	function handleBack() {
		dispatch('back');
	}

	function handleSelectBooth(booth) {
		dispatch('selectBooth', booth);
	}
</script>

<div class="flex flex-1 flex-col">
	<div class="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
		<button on:click={handleBack} class="text-2xl" aria-label="뒤로 가기">←</button>
		<h1 class="flex-1 text-lg font-bold">부스 선택</h1>
	</div>

	<div class="flex-1 overflow-y-auto p-4">
		{#if !booths?.length}
			<div
				class="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500"
			>
				등록된 부스가 없습니다.
			</div>
		{:else}
			<div class="grid grid-cols-2 gap-3">
				{#each booths as booth (booth.id)}
					<button
						on:click={() => handleSelectBooth(booth)}
						class="rounded-2xl border border-cyan-100 bg-cyan-50 p-4 text-left text-cyan-900 shadow-sm transition hover:bg-cyan-100"
					>
						<p class="text-base font-semibold">{booth.name}</p>
					</button>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	button {
		border: none;
		background: none;
		cursor: pointer;
	}
</style>
