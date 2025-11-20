<script>
	import { createEventDispatcher } from 'svelte';
	import { formatCurrency, formatDateTime, toArray } from '$lib/utils/format';

	export let transactions = [];
	export let total = 0;

	const dispatch = createEventDispatcher();

	function goBack() {
		dispatch('navigate', 'home');
	}

	$: normalized = toArray(transactions).map((tx) => {
		const boothName = tx.boothName || tx.booth?.name || tx.edges?.booth?.name;
		const buyer =
			tx.buyerName ||
			tx.userName ||
			tx.user?.username ||
			tx.edges?.user?.username ||
			tx.edges?.user?.name ||
			tx.user_id ||
			tx.userId ||
			'알 수 없음';
		const timestamp = tx.timestamp || tx.createdAt || tx.updatedAt;
		return {
			id: tx.id ?? `${tx.booth_id ?? 'income'}-${timestamp ?? Math.random()}`,
			title: boothName || '판매',
			buyer,
			amount: Number(tx.amount ?? 0),
			date: formatDateTime(timestamp)
		};
	});
</script>

<div class="flex h-full flex-col bg-gray-50">
	<header class="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
		<button on:click={goBack} class="text-2xl border-0 bg-transparent" aria-label="뒤로 가기">←</button>
		<h1 class="text-lg font-bold">수익 내역</h1>
	</header>

	<section class="space-y-4 overflow-y-auto p-4">
		<div class="rounded-3xl bg-cyan-600 p-5 text-white shadow">
			<p class="text-sm opacity-90">누적 수익</p>
			<p class="mt-1 text-3xl font-bold">{formatCurrency(total)}</p>
		</div>

		{#if normalized.length === 0}
			<p class="rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-6 text-center text-sm text-gray-500">
				수익 내역이 없습니다.
			</p>
		{:else}
			<div class="space-y-3 pb-4">
				{#each normalized as tx (tx.id)}
					<div class="rounded-2xl bg-white p-4 shadow-sm">
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-semibold text-gray-900">{tx.title}</p>
								<p class="text-xs text-gray-500">{tx.date}</p>
							</div>
							<p class="text-sm font-bold text-emerald-600">+{formatCurrency(tx.amount)}</p>
						</div>
						<p class="mt-2 text-xs text-gray-500">구매자: {tx.buyer}</p>
					</div>
				{/each}
			</div>
		{/if}
	</section>
</div>

<style>
	button {
		cursor: pointer;
	}
</style>
