<script>
	import { createEventDispatcher } from 'svelte';
	import { formatCurrency } from '$lib/utils/format';

	export let booth = null;
	export let menus = [];
	export let selectedItems = [];

	const dispatch = createEventDispatcher();

	function handleBack() {
		dispatch('back');
	}

	function handleAddItem(item) {
		dispatch('addItem', item);
	}

	function handleUpdate(itemId, quantity) {
		dispatch('updateQuantity', { itemId, quantity });
	}

	function handleCheckout() {
		if (selectedItems.length > 0) {
			dispatch('checkout');
		}
	}

	$: quantityByProduct = selectedItems.reduce((acc, item) => {
		const key = item.productId ?? item.id;
		acc[key] = item.quantity;
		return acc;
	}, {});

	$: totalPrice = selectedItems.reduce((sum, item) => sum + (item.price ?? 0) * item.quantity, 0);
</script>

<div class="flex flex-1 flex-col">
	<div class="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
		<button on:click={handleBack} class="text-2xl" aria-label="뒤로 가기">←</button>
		<h1 class="flex-1 text-lg font-bold">{booth?.name}</h1>
	</div>

	<div class="flex-1 overflow-y-auto p-4">
		{#if !menus?.length}
			<p
				class="rounded-xl border border-dashed border-gray-300 p-4 text-center text-sm text-gray-500"
			>
				등록된 메뉴가 없습니다.
			</p>
		{:else}
			<div class="space-y-3">
				{#each menus as menu (`${booth?.id ?? 'booth'}-${menu.id}`)}
					<div class="rounded-2xl border border-cyan-100 bg-white p-4 shadow-sm">
						<div class="flex items-start justify-between gap-3">
							<div class="flex-1">
								<p class="text-base font-semibold text-gray-900">{menu.name}</p>
								{#if menu.description}
									<p class="text-xs text-gray-500">{menu.description}</p>
								{/if}
								<p class="mt-2 text-lg font-bold text-cyan-600">
									{formatCurrency(menu.price)}
								</p>
							</div>
						</div>

						<div class="mt-4 flex items-center justify-between rounded-xl bg-cyan-50 px-3 py-2">
							{#if !quantityByProduct[menu.id]}
								<button
									on:click={() => handleAddItem(menu)}
									class="flex-1 rounded-xl bg-cyan-600 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700"
								>
									추가
								</button>
							{:else}
								<button
									on:click={() => handleUpdate(menu.id, quantityByProduct[menu.id] - 1)}
									class="flex h-10 w-10 items-center justify-center text-xl font-bold text-cyan-700"
								>
									–
								</button>
								<span class="flex-1 text-center text-lg font-bold text-cyan-900">
									{quantityByProduct[menu.id]}
								</span>
								<button
									on:click={() => handleUpdate(menu.id, quantityByProduct[menu.id] + 1)}
									class="flex h-10 w-10 items-center justify-center text-xl font-bold text-cyan-700"
								>
									+
								</button>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<div class="border-t border-gray-100 bg-white p-4">
		<button
			on:click={handleCheckout}
			class="w-full rounded-xl bg-cyan-600 py-3 text-base font-bold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-cyan-200"
			disabled={totalPrice <= 0}
		>
			{totalPrice > 0 ? `결제하기 (${formatCurrency(totalPrice)})` : '메뉴를 선택해주세요'}
		</button>
	</div>
</div>

<style>
	button {
		border: none;
		background: none;
		cursor: pointer;
	}

	button[disabled] {
		cursor: not-allowed;
	}
</style>
