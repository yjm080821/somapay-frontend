<script>
	import { createEventDispatcher } from 'svelte';
	import { formatCurrency } from '$lib/utils/format';

	export let pending = false;
	export let error = '';

	const dispatch = createEventDispatcher();

	let amount = '';
	let localError = '';

	function goBack() {
		dispatch('navigate', 'home');
	}

	function submit() {
		localError = '';
		const value = Number(amount);
		if (!Number.isFinite(value) || value <= 0) {
			localError = '충전 금액을 올바르게 입력해주세요.';
			return;
		}

		dispatch('requestCharge', value);
		amount = '';
	}

	$: preview = Number(amount) > 0 ? formatCurrency(Number(amount)) : null;
</script>

<div class="flex h-full flex-col bg-gray-50">
	<header class="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
		<button on:click={goBack} class="text-2xl" aria-label="뒤로 가기">←</button>
		<h1 class="text-lg font-bold">충전하기</h1>
	</header>

	<section class="flex-1 space-y-5 overflow-y-auto p-5">
		<div class="rounded-3xl bg-white p-5 shadow">
			<label class="text-sm font-semibold text-gray-700" for="charge-amount">충전 금액</label>
			<input
				id="charge-amount"
				type="number"
				inputmode="numeric"
				min="0"
				step="1000"
				bind:value={amount}
				placeholder="예) 5000"
				class="mt-3 w-full rounded-2xl border border-gray-200 px-4 py-3 text-base focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-100"
				disabled={pending}
			/>
			{#if preview}
				<p class="mt-2 text-sm text-gray-500">예상 충전액: <strong>{preview}</strong></p>
			{/if}
		</div>

		<div class="rounded-3xl bg-cyan-50 p-4 text-sm text-cyan-700">
			<p>관리자가 승인하면 포인트가 충전됩니다. 진행 상황은 요청 내역에서 확인할 수 있어요.</p>
		</div>

		{#if localError}
			<p class="text-sm text-red-500">{localError}</p>
		{:else if error}
			<p class="text-sm text-red-500">{error}</p>
		{/if}
	</section>

	<footer class="border-t border-gray-100 bg-white p-4">
		<button
			on:click={submit}
			class="w-full rounded-2xl bg-cyan-600 py-3 text-base font-bold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-cyan-200"
			disabled={pending}
		>
			{pending ? '요청 중...' : '충전 요청하기'}
		</button>
	</footer>
</div>

<style>
	button {
		border: none;
		cursor: pointer;
		background: none;
	}

	footer button {
		background: #0891b2;
	}
</style>
