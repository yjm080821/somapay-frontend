<script>
	import { createEventDispatcher } from 'svelte';
	import { formatCurrency, formatDateTime, toArray } from '$lib/utils/format';

	export let transactions = [];
	export let loading = false;
	export let error = '';
	export let canLoadMore = false;

	const dispatch = createEventDispatcher();

	function goBack() {
		dispatch('navigate', 'home');
	}

	function refresh() {
		dispatch('refresh');
	}

	function loadMore() {
		dispatch('loadMore');
	}

	$: normalizedTransactions = toArray(transactions).map((tx) => {
		const amount =
			tx.amount ?? tx.point ?? (tx.product?.price ?? tx.price ?? 0) * (tx.quantity ?? 1);

		return {
			id: tx.id ?? `${tx.productId ?? 'tx'}-${tx.createdAt ?? Math.random()}`,
			title: tx.product?.name || tx.productName || tx.boothName || `상품 #${tx.productId ?? '-'}`,
			subtitle: `${formatDateTime(tx.createdAt || tx.updatedAt)} · ${
				tx.boothName ? `부스 ${tx.boothName}` : `상품 ${tx.productId ?? '-'}`
			}`,
			amount,
			type: amount < 0 ? 'out' : 'in'
		};
	});
</script>

<div class="flex min-h-full flex-col bg-gray-50 p-4">
	<div class="mb-4 flex items-center gap-3">
		<button on:click={goBack} class="text-2xl" aria-label="뒤로 가기">←</button>
		<h1 class="flex-1 text-lg font-bold">거래 내역</h1>
		<button
			on:click={refresh}
			class="rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-600 transition hover:bg-gray-100"
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
							<p
								class={`text-sm font-bold ${tx.type === 'out' ? 'text-red-500' : 'text-green-600'}`}
							>
								{tx.type === 'out' ? '-' : '+'}{formatCurrency(Math.abs(tx.amount))}
							</p>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	{#if error}
		<p class="mt-4 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>
	{/if}

	{#if canLoadMore}
		<button
			on:click={loadMore}
			class="mt-4 w-full rounded-xl border border-gray-300 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-70"
			disabled={loading}
		>
			더 불러오기
		</button>
	{/if}
</div>

<style>
	button {
		border: none;
		background: none;
		cursor: pointer;
	}
</style>
