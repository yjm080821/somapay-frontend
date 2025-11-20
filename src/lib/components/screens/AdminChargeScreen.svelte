<script>
	import { createEventDispatcher } from 'svelte';
	import { formatCurrency, formatDateTime, toArray } from '$lib/utils/format';

	export let requests = [];
	export let pendingId = null;

	const dispatch = createEventDispatcher();

	function goBack() {
		dispatch('navigate', 'home');
	}

	function approve(id) {
		dispatch('approveCharge', id);
	}

	function reject(id) {
		dispatch('rejectCharge', id);
	}

	$: normalized = toArray(requests).map((request) => {
		const timestamp = request.timestamp || request.createdAt || request.updatedAt;
		const username =
			request.username ||
			request.studentNumber ||
			request.user?.username ||
			request.edges?.user?.username ||
			request.user?.name ||
			request.userId ||
			'-';
		return {
			id: request.id,
			amount: request.amount,
			userLabel: username,
			date: formatDateTime(timestamp)
		};
	});
</script>

<div class="flex h-full flex-col bg-gray-50">
	<header class="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
		<button on:click={goBack} class="text-2xl border-0 bg-transparent" aria-label="뒤로 가기">←</button>
		<h1 class="text-lg font-bold">충전 승인</h1>
	</header>

	<section class="flex-1 space-y-3 overflow-y-auto p-4">
		{#if normalized.length === 0}
			<p class="rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-6 text-center text-sm text-gray-500">
				대기 중인 요청이 없습니다.
			</p>
		{:else}
			{#each normalized as request (request.id)}
				<div class="rounded-2xl bg-white p-4 shadow-sm">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-sm font-semibold text-gray-900">{request.userLabel}</p>
							<p class="text-xs text-gray-500">{request.date}</p>
						</div>
						<p class="text-base font-bold text-gray-900">{formatCurrency(request.amount)}</p>
					</div>
					<div class="mt-3 flex gap-3">
						<button
							on:click={() => approve(request.id)}
							class="flex-1 rounded-2xl bg-emerald-500 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-emerald-200"
							disabled={pendingId === request.id}
						>
							승인
						</button>
						<button
							on:click={() => reject(request.id)}
							class="flex-1 rounded-2xl border border-red-200 bg-red-50 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70"
							disabled={pendingId === request.id}
						>
							거절
						</button>
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
