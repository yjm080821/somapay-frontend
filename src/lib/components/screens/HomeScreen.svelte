<script>
	import { createEventDispatcher } from 'svelte';
	import { formatCurrency, formatDateTime, toArray } from '$lib/utils/format';

	export let user = null;
	export let transactions = [];
	export let charges = [];
	export let chargeRequests = [];
	export let role = 'USER';
	export let chargePending = false;
	export let chargeError = '';
	export let adminActionPendingId = null;

	const dispatch = createEventDispatcher();
	const getUid = () => globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);

	let chargeAmount = '';
	let localError = '';

	function goTo(screen) {
		dispatch('navigate', screen);
	}

	function submitCharge() {
		localError = '';

		const numericAmount = Number(String(chargeAmount).replace(/[^0-9]/g, ''));
		if (!numericAmount || numericAmount < 1000) {
			localError = '1,000원 이상 입력해주세요.';
			return;
		}

		dispatch('requestCharge', numericAmount);
		chargeAmount = '';
	}

	function handleApprove(id) {
		dispatch('approveCharge', id);
	}

	function handleReject(id) {
		dispatch('rejectCharge', id);
	}

	function logout() {
		dispatch('logout');
	}

	$: normalizedTransactions = toArray(transactions)
		.map((tx) => {
			const boothName = tx.boothName || tx.edges?.booth?.name;
			const amount = Number(tx.amount ?? 0);
			const isSelf = user?.id && (tx.userId ?? tx.edges?.user?.id) === user.id;

			return {
				id: tx.id ?? getUid(),
				title: boothName || tx.edges?.product?.name || `거래 #${tx.id || ''}`,
				subtitle: formatDateTime(tx.timestamp || tx.createdAt || tx.updatedAt),
				amount: Math.abs(amount),
				type: isSelf ? 'out' : 'in'
			};
		})
		.slice(0, 5);

	$: normalizedCharges = toArray(charges).map((charge) => ({
		id: charge.id ?? getUid(),
		amount: Number(charge.amount ?? 0),
		status: charge.status ?? 'PENDING',
		date: formatDateTime(charge.timestamp || charge.updatedAt || charge.createdAt),
		userId: charge.userId ?? charge.edges?.user?.id
	}));

	$: adminCharges = toArray(chargeRequests).map((request) => ({
		...request,
		userLabel: request.userId || request.edges?.user?.username || request.edges?.user?.id || '-'
	}));
</script>

<div class="space-y-6 bg-gray-50 p-6">
	<div class="flex items-start justify-between gap-4">
		<div>
			<p class="text-sm text-gray-500">안녕하세요,</p>
			<h1 class="text-2xl font-bold text-gray-900">
				{user?.username ? `${user.username}님` : '사용자님'}
			</h1>
			<p
				class="mt-1 inline-flex rounded-full bg-gray-200 px-3 py-1 text-xs font-semibold text-gray-600"
			>
				{role}
			</p>
		</div>
		<button
			on:click={logout}
			class="rounded-full border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-100 active:scale-95"
		>
			로그아웃
		</button>
	</div>

	<div class="rounded-2xl bg-cyan-600 p-6 text-white shadow-lg">
		<p class="text-sm opacity-90">보유 포인트</p>
		<p class="mt-2 text-4xl font-bold">{formatCurrency(user?.point ?? 0)}</p>
	</div>

	<div class="grid grid-cols-3 gap-3">
		<button class="quick-btn" on:click={() => goTo('payment')}>
			<span class="text-2xl">💳</span>
			<span>결제하기</span>
		</button>
		<button class="quick-btn" on:click={submitCharge}>
			<span class="text-2xl">⚡️</span>
			<span>즉시충전</span>
		</button>
		<button class="quick-btn" on:click={() => goTo('history')}>
			<span class="text-2xl">🧾</span>
			<span>거래내역</span>
		</button>
	</div>

	<div class="rounded-2xl bg-white p-5 shadow">
		<div class="mb-4 flex items-center justify-between">
			<div>
				<h2 class="text-base font-semibold text-gray-900">포인트 충전</h2>
				<p class="text-xs text-gray-500">충전 요청은 관리자 승인 후 적용됩니다.</p>
			</div>
		</div>

		<div class="space-y-3">
			<input
				type="text"
				inputmode="numeric"
				placeholder="충전할 금액 (최소 1,000원)"
				bind:value={chargeAmount}
				class="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 focus:outline-none"
				disabled={chargePending}
			/>
			<div class="flex gap-3">
				{#each [10000, 20000, 50000] as preset (preset)}
					<button
						class="flex-1 rounded-xl border border-cyan-200 px-3 py-2 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-50"
						type="button"
						disabled={chargePending}
						on:click={() => {
							chargeAmount = preset.toString();
						}}
					>
						{formatCurrency(preset)}
					</button>
				{/each}
			</div>

			{#if localError}
				<p class="text-xs text-red-500">{localError}</p>
			{:else if chargeError}
				<p class="text-xs text-red-500">{chargeError}</p>
			{/if}

			<button
				class="w-full rounded-xl bg-cyan-600 py-3 text-sm font-bold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-cyan-200"
				on:click={submitCharge}
				disabled={chargePending}
			>
				{chargePending ? '요청 중...' : '충전 요청'}
			</button>
		</div>
	</div>

	<div class="rounded-2xl bg-white p-5 shadow">
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-base font-semibold text-gray-900">최근 거래</h2>
			<button class="text-xs font-semibold text-cyan-600" on:click={() => goTo('history')}>
				전체보기
			</button>
		</div>

		{#if normalizedTransactions.length === 0}
			<p class="text-sm text-gray-500">아직 거래 내역이 없습니다.</p>
		{:else}
			<div class="space-y-3">
				{#each normalizedTransactions as tx (tx.id)}
					<div
						class="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3"
					>
						<div>
							<p class="text-sm font-semibold text-gray-900">{tx.title}</p>
							<p class="text-xs text-gray-500">{tx.subtitle}</p>
						</div>
						<p class={`text-sm font-bold ${tx.type === 'out' ? 'text-red-500' : 'text-green-600'}`}>
							{tx.type === 'out' ? '-' : '+'}{formatCurrency(tx.amount)}
						</p>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<div class="rounded-2xl bg-white p-5 shadow">
		<h2 class="mb-4 text-base font-semibold text-gray-900">충전 요청 내역</h2>
		{#if normalizedCharges.length === 0}
			<p class="text-sm text-gray-500">충전 요청 기록이 없습니다.</p>
		{:else}
			<div class="space-y-3">
				{#each normalizedCharges as charge (charge.id)}
					<div
						class="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3"
					>
						<div>
							<p class="text-sm font-semibold text-gray-900">{formatCurrency(charge.amount)}</p>
							<p class="text-xs text-gray-500">{charge.date || '-'}</p>
						</div>
						<span
							class={`rounded-full px-3 py-1 text-xs font-semibold ${
								charge.status === 'APPROVED'
									? 'bg-green-100 text-green-700'
									: charge.status === 'REJECTED'
										? 'bg-red-100 text-red-600'
										: 'bg-yellow-100 text-yellow-600'
							}`}
						>
							{charge.status}
						</span>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	{#if adminCharges.length > 0}
		<div class="rounded-2xl bg-white p-5 shadow">
			<div class="mb-4">
				<p class="text-xs font-semibold text-cyan-600">관리자</p>
				<h2 class="text-base font-semibold text-gray-900">승인 대기 중인 충전 요청</h2>
			</div>
			<div class="space-y-3">
				{#each adminCharges as request (request.id)}
					<div class="rounded-xl border border-gray-100 p-4">
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-semibold text-gray-900">
									사용자 {request.userLabel ?? '-'}
								</p>
								<p class="text-xs text-gray-500">
									{formatDateTime(request.createdAt || request.updatedAt)}
								</p>
							</div>
							<p class="text-base font-bold text-gray-900">{formatCurrency(request.amount)}</p>
						</div>
						<div class="mt-3 flex gap-2">
							<button
								class="flex-1 rounded-xl border border-gray-200 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-70"
								on:click={() => handleReject(request.id)}
								disabled={adminActionPendingId === request.id}
							>
								거절
							</button>
							<button
								class="flex-1 rounded-xl bg-cyan-600 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-cyan-200"
								on:click={() => handleApprove(request.id)}
								disabled={adminActionPendingId === request.id}
							>
								승인
							</button>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.quick-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 16px;
		border-radius: 16px;
		background: #e0f2ff;
		color: #0e7490;
		font-size: 14px;
		font-weight: 600;
		gap: 6px;
		transition: background 0.2s ease;
	}

	.quick-btn:hover {
		background: #bae6fd;
	}

	.quick-btn span {
		display: block;
		text-align: center;
	}
</style>
