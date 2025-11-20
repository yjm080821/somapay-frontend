<script>
	import { createEventDispatcher } from 'svelte';

	export let booths = [];

	const dispatch = createEventDispatcher();

let name = '';
let managerUsername = '';

let editingId = null;
let editName = '';
let editManagerUsername = '';

	function goBack() {
		dispatch('navigate', 'home');
	}

	function createBooth() {
		if (!name.trim() || !managerUsername.trim()) return;
		dispatch('createBooth', { name: name.trim(), username: managerUsername.trim() });
		name = '';
		managerUsername = '';
	}

	function startEdit(booth) {
		editingId = booth.id;
		editName = booth.name || '';
		editManagerUsername =
			booth.ownerUsername ??
			booth.managerUsername ??
			booth.owner?.username ??
			booth.user?.username ??
			booth.raw?.user?.username ??
			'';
	}

	function cancelEdit() {
		editingId = null;
		editName = '';
		editManagerUsername = '';
	}

	function submitEdit() {
		if (!editingId) return;
		dispatch('updateBooth', {
			id: editingId,
			name: editName,
			username: editManagerUsername
		});
		cancelEdit();
	}

	function remove(booth) {
		if (!booth?.id) return;
		dispatch('deleteBooth', { id: booth.id });
	}
</script>

<div class="flex h-full flex-col bg-gray-50">
	<header class="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
		<button on:click={goBack} class="text-2xl border-0 bg-transparent" aria-label="뒤로 가기">←</button>
		<h1 class="text-lg font-bold">부스 관리</h1>
	</header>

	<section class="space-y-5 overflow-y-auto p-4">
		<div class="rounded-3xl bg-white p-5 shadow">
			<h2 class="text-base font-semibold text-gray-900">새 부스 등록</h2>
			<div class="mt-4 grid gap-3 md:grid-cols-2">
				<input
					type="text"
					placeholder="부스 이름"
					bind:value={name}
					class="rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-100"
				/>
				<input
					type="text"
					placeholder="담당자 사용자명"
					bind:value={managerUsername}
					class="rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-100"
				/>
			</div>
			<button
				on:click={createBooth}
				class="mt-4 w-full rounded-2xl bg-cyan-600 py-3 text-sm font-bold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-cyan-200"
				disabled={!name || !managerUsername}
			>
				부스 생성
			</button>
		</div>

		<div class="space-y-3">
			{#each booths as booth (booth.id)}
				<div class="rounded-2xl bg-white p-4 shadow-sm">
					<div class="flex items-center justify-between gap-3">
						<div>
							<p class="text-sm font-semibold text-gray-900">{booth.name}</p>
							<p class="text-xs text-gray-500">
								ID {booth.id} · 담당자
								{booth.ownerUsername ??
									booth.managerUsername ??
									booth.owner?.username ??
									booth.user?.username ??
									'-'}
							</p>
						</div>
						<div class="flex gap-2">
							<button
								on:click={() => startEdit(booth)}
								class="rounded-xl border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600"
							>
								수정
							</button>
							<button
								on:click={() => remove(booth)}
								class="rounded-xl border border-red-200 px-3 py-1 text-xs font-semibold text-red-600"
							>
								삭제
							</button>
						</div>
					</div>

					{#if editingId === booth.id}
						<div class="mt-4 space-y-3 rounded-2xl bg-gray-50 p-4">
							<input
								type="text"
								placeholder="새로운 부스 이름"
								bind:value={editName}
								class="w-full rounded-2xl border border-gray-200 px-4 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-100"
							/>
							<input
								type="text"
								placeholder="담당자 사용자명"
								bind:value={editManagerUsername}
								class="w-full rounded-2xl border border-gray-200 px-4 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-100"
							/>
							<div class="flex gap-2">
								<button
									on:click={submitEdit}
									class="flex-1 rounded-2xl bg-cyan-600 py-2 text-sm font-semibold text-white"
								>
									저장
								</button>
								<button
									on:click={cancelEdit}
									class="flex-1 rounded-2xl border border-gray-300 py-2 text-sm font-semibold text-gray-600"
								>
									취소
								</button>
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</section>
</div>

<style>
	button {
		cursor: pointer;
	}
</style>
