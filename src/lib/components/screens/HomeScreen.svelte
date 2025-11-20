<script>
	import { createEventDispatcher } from 'svelte';
	import { formatCurrency } from '$lib/utils/format';

	export let user = null;
	export let role = 'USER';
	export let isAdmin = false;
	export let isHost = false;

	const dispatch = createEventDispatcher();

	const ACTIONS = [
		{
			id: 'payment',
			label: '결제하기',
			description: '부스 선택 후 결제',
			emoji: '💳',
			roles: ['USER', 'HOST', 'ADMIN']
		},
		{
			id: 'charge',
			label: '충전하기',
			description: '포인트 충전 요청',
			emoji: '⚡',
			roles: ['USER', 'HOST', 'ADMIN']
		},
		{
			id: 'charge-requests',
			label: '요청내역',
			description: '충전 요청 상태 확인',
			emoji: '📋',
			roles: ['USER', 'HOST', 'ADMIN']
		},
		{
			id: 'spending',
			label: '지출내역',
			description: '나의 사용 기록',
			emoji: '🧾',
			roles: ['USER', 'HOST', 'ADMIN']
		},
		{
			id: 'income',
			label: '수익내역',
			description: '부스 매출 확인',
			emoji: '📈',
			roles: ['HOST', 'ADMIN']
		},
		{
			id: 'admin-charges',
			label: '충전승인',
			description: '요청 승인/거절',
			emoji: '✅',
			roles: ['ADMIN']
		},
		{
			id: 'booth-management',
			label: '부스관리',
			description: '부스 생성/수정',
			emoji: '🏠',
			roles: ['ADMIN']
		},
		{
			id: 'product-management',
			label: '상품관리',
			description: '메뉴 구성',
			emoji: '🍱',
			roles: ['HOST', 'ADMIN']
		},
	// 보안설정은 헤더 버튼으로 이동했으므로 리스트에서 제외
];

	$: normalizedRole = (role || '').toUpperCase() || 'USER';

	function logout() {
		dispatch('logout');
	}

	function navigate(target) {
		dispatch('navigate', target);
	}

	function canSee(action) {
		if (!action?.roles?.length) {
			return true;
		}
		return action.roles.some((code) => {
			if (code === 'ALL') return true;
			if (code === 'ADMIN') return isAdmin;
			if (code === 'HOST') return isHost;
			if (code === 'USER') return true;
			return normalizedRole === code;
		});
	}

	$: availableActions = ACTIONS.filter((action) => canSee(action));
</script>

<div class="flex h-full flex-col gap-4 bg-gray-50 p-4">
	<section class="rounded-3xl bg-white p-5 shadow">
		<p class="text-sm text-gray-500">보유 포인트</p>
		<p class="mt-2 text-4xl font-bold text-cyan-600">
			{formatCurrency(user?.point ?? user?.points ?? 0)}
		</p>
		<div class="mt-4 grid gap-2 text-sm text-gray-600">
			<div class="flex items-center justify-between">
				<span class="font-semibold text-gray-800">사용자</span>
				<span>{user?.username ?? '-'}</span>
			</div>
			<div class="flex items-center justify-between">
				<span class="font-semibold text-gray-800">권한</span>
				<span>{normalizedRole}</span>
			</div>
		</div>
		<div class="mt-6 flex gap-3">
			<button
				on:click={logout}
				class="flex-1 rounded-2xl border border-gray-200 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
			>
				로그아웃
			</button>
			<button
				on:click={() => navigate('credentials')}
				class="flex-1 rounded-2xl border border-cyan-100 bg-cyan-50 py-3 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-100"
			>
				보안설정
			</button>
		</div>
	</section>

	<section class="flex-1 rounded-3xl bg-white p-5 shadow">
		<h2 class="mb-4 text-base font-semibold text-gray-900">무엇을 하시겠어요?</h2>
		{#if availableActions.length === 0}
			<p class="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500">
				현재 권한으로 사용할 수 있는 기능이 없습니다.
			</p>
		{:else}
			<div class="grid grid-cols-2 gap-3">
				{#each availableActions as action (action.id)}
					<button
						on:click={() => navigate(action.id)}
						class="flex flex-col gap-2 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 p-4 text-left text-gray-800 transition hover:from-cyan-50 hover:to-cyan-100"
					>
						<span class="text-2xl">{action.emoji}</span>
						<div>
							<p class="text-sm font-bold">{action.label}</p>
							<p class="text-xs text-gray-500">{action.description}</p>
						</div>
					</button>
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
