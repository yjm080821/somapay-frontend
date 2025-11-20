<script>
	import { createEventDispatcher } from 'svelte';
	import { formatCurrency, formatDateTime, toArray } from '$lib/utils/format';

	export let transactions = [];

	const dispatch = createEventDispatcher();

	function goBack() {
		dispatch('navigate', 'home');
	}

	$: normalized = toArray(transactions).map((tx) => {
		const boothName = tx.boothName || tx.booth?.name || tx.edges?.booth?.name;
		const productName = tx.productName || tx.product?.name || tx.edges?.product?.name;
		const timestamp = tx.timestamp || tx.createdAt || tx.updatedAt;
		const amount = Number(tx.amount ?? 0);
		return {
			id: tx.id ?? `${tx.product_id ?? 'tx'}-${timestamp ?? Math.random()}`,
			title: productName || boothName || '거래',
			subtitle: `${boothName || '기록 없음'} · ${formatDateTime(timestamp)}`,
			amount
		};
	});
</script>

<div class="flex h-full flex-col bg-gray-50">
	<header class="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
		<button on:click={goBack} class="text-2xl border-0 bg-transparent" aria-label="뒤로 가기">←</button>
		<h1 class="text-lg font-bold">지출 내역</h1>
	</header>

	<section class="flex-1 space-y-4 overflow-y-auto p-4">
		{#if normalized.length === 0}
			<p class="rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-6 text-center text-sm text-gray-500">
				아직 지출 내역이 없습니다.
			</p>
		{:else}
			{#each normalized as tx (tx.id)}
				<div class="rounded-2xl bg-white p-4 shadow-sm">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-sm font-semibold text-gray-900">{tx.title}</p>
							<p class="text-xs text-gray-500">{tx.subtitle}</p>
						</div>
						<p class="text-sm font-bold text-red-500">-{formatCurrency(Math.abs(tx.amount))}</p>
					</div>
				</div>
			{/each}
		{/if}
	</section>
</div>

<style>
	button {
		cursor: pointer;
	}
</style>
