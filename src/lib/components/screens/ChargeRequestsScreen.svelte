<script>
	import { createEventDispatcher } from 'svelte';
	import { formatCurrency, formatDateTime, toArray } from '$lib/utils/format';

export let requests = [];

const dispatch = createEventDispatcher();

function goBack() {
	dispatch('navigate', 'home');
}

function generateId() {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}
	return Math.random().toString(36).slice(2);
}

const STATUS_COLOR = {
	PENDING: 'text-amber-600 bg-amber-50',
	APPROVED: 'text-green-600 bg-green-50',
	REJECTED: 'text-red-600 bg-red-50'
};

	$: normalizedRequests = toArray(requests)
		.map((request) => {
			const status = (request?.status || '').toUpperCase();
			const timestamp = request?.timestamp || request?.createdAt || request?.updatedAt;
			return {
				id: request?.id ?? generateId(),
				amount: request?.amount ?? 0,
				status,
				createdAt: timestamp,
				label: status === 'PENDING' ? '승인 대기' : status === 'APPROVED' ? '완료' : '거절'
			};
		})
		.sort((a, b) => {
			const left = new Date(b.createdAt || 0).getTime();
			const right = new Date(a.createdAt || 0).getTime();
			return left - right;
		});
</script>

<div class="flex h-full flex-col bg-gray-50">
	<header class="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
		<button on:click={goBack} class="text-2xl" aria-label="뒤로 가기">←</button>
		<h1 class="text-lg font-bold">충전 요청 내역</h1>
	</header>

	<section class="flex-1 space-y-3 overflow-y-auto p-4">
		{#if normalizedRequests.length === 0}
			<p class="rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-6 text-center text-sm text-gray-500">
				요청한 충전 내역이 없습니다.
			</p>
		{:else}
			{#each normalizedRequests as request (request.id)}
				<div class="rounded-2xl bg-white p-4 shadow-sm">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-xs text-gray-500">
								{formatDateTime(request.createdAt)}
							</p>
							<p class="mt-1 text-base font-bold text-gray-900">
								{formatCurrency(request.amount)}
							</p>
						</div>
						<span class={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLOR[request.status] || 'bg-gray-100 text-gray-600'}`}>
							{request.label}
						</span>
					</div>
				</div>
			{/each}
		{/if}
	</section>
</div>

<style>
	button {
		border: none;
		cursor: pointer;
		background: none;
	}
</style>
