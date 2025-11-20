<script>
	import { createEventDispatcher } from 'svelte';
	import { formatCurrency, formatDateTime, toArray } from '$lib/utils/format';

	export let transactions = [];
	export let loading = false;

	const dispatch = createEventDispatcher();

	function goBack() {
		dispatch('navigate', 'home');
	}

	function refresh() {
		dispatch('refresh');
	}

	$: normalizedTransactions = toArray(transactions).map((tx) => {
		const amount = Number(tx.amount ?? 0);
		const boothName = tx.boothName || tx.edges?.booth?.name;
		const productName = tx.productName || tx.edges?.product?.name;

		return {
			id: tx.id ?? `${tx.product_id ?? 'tx'}-${tx.timestamp ?? Math.random()}`,
			title: productName || boothName || `거래 #${tx.id ?? '-'}`,
			subtitle: `${formatDateTime(tx.timestamp || tx.createdAt || tx.updatedAt)} · ${
				boothName ? `부스 ${boothName}` : `상품 ${tx.productId ?? '-'}`
			}`,
			amount
		};
	});
</script>

<div class="flex min-h-full flex-col bg-gray-50 p-4">
	<div class="mb-4 flex items-center gap-3">
		<button on:click={goBack} class="text-2xl border-0 bg-transparent" aria-label="뒤로 가기">
			←
		</button>
		<h1 class="flex-1 text-lg font-bold">거래 내역</h1>
		<button
			on:click={refresh}
			class="rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed"
			disabled={loading}
		>
			새로고침
		</button>
	</div>

	<div class="flex-1 space-y-3">
		{#if loading && normalizedTransactions.length === 0}
			<p class="rounded-xl bg-white p-4 text-center text-sm text-gray-500">불러오는 중...</p>
		{:else if normalizedTransactions.length === 0}
			<p class="rounded-xl bg-white p-4 text-center text-sm text-gray-500">거래 내역이 없습니다.</p>
		{:else}
			<div class="space-y-3">
				{#each normalizedTransactions as tx (tx.id)}
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
			</div>
		{/if}
	</div>
</div>

<style>
	button {
		cursor: pointer;
	}
</style>
