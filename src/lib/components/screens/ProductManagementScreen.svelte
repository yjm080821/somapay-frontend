<script>
	import { createEventDispatcher } from 'svelte';
	import { formatCurrency } from '$lib/utils/format';

	export let booths = [];
	export let products = [];
	export let user = null;
	export let isAdmin = false;
	export let isHost = false;

	const dispatch = createEventDispatcher();

	let form = {
		boothId: '',
		name: '',
		description: '',
		price: ''
	};

	let editingId = null;
	let editName = '';
	let editDescription = '';
	let editPrice = '';

	function goBack() {
		dispatch('navigate', 'home');
	}

	function normalizeId(value) {
		if (value === undefined || value === null || value === '') {
			return null;
		}
		const asNumber = Number(value);
		return Number.isNaN(asNumber) ? null : asNumber;
	}

	function manageableBoothIds() {
		const currentUserId = normalizeId(user?.id ?? user?.userId ?? user?.user_id);
		return (booths || [])
			.filter((booth) => {
				if (isAdmin) return true;
				if (isHost && currentUserId !== null) {
					const ownerId =
						booth.userId ??
						booth.user_id ??
						booth.user?.id ??
						booth.edges?.user?.id;
					const normalizedOwner = normalizeId(ownerId);
					return normalizedOwner !== null && normalizedOwner === currentUserId;
				}
				return false;
			})
			.map((booth) => normalizeId(booth.id ?? booth.boothId ?? booth.booth_id))
			.filter((id) => id !== null);
	}

	$: allowedBoothIds = manageableBoothIds();
	$: allowedProducts = (products || []).filter((product) =>
		allowedBoothIds.includes(
			normalizeId(product.boothId ?? product.booth_id ?? product.booth?.id)
		)
	);
	$: boothLookup = new Map(
		(booths || [])
			.map((booth) => [normalizeId(booth.id ?? booth.boothId ?? booth.booth_id), booth])
			.filter(([id]) => id !== null)
	);

	function updateForm(field, value) {
		form = { ...form, [field]: value };
	}

	function submitProduct() {
		if (!form.boothId || !form.name.trim() || !form.price) return;
		dispatch('createProduct', {
			boothId: Number(form.boothId),
			name: form.name,
			description: form.description,
			price: Number(form.price)
		});
		form = { boothId: '', name: '', description: '', price: '' };
	}

	function startEdit(product) {
		editingId = product.id;
		editName = product.name || '';
		editDescription = product.description || '';
		editPrice = product.price ?? '';
	}

	function cancelEdit() {
		editingId = null;
		editName = '';
		editDescription = '';
		editPrice = '';
	}

	function submitEdit(product) {
		if (!editingId) return;
		const payload = { id: product.id };
		if (editName && editName !== product.name) payload.name = editName;
		if (editDescription !== product.description) payload.description = editDescription;
		if (editPrice !== '' && Number(editPrice) !== Number(product.price)) {
			payload.price = Number(editPrice);
		}
		dispatch('updateProduct', payload);
		cancelEdit();
	}

	function remove(product) {
		dispatch('deleteProduct', { id: product.id });
	}
</script>

<div class="flex h-full flex-col bg-gray-50">
	<header class="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
		<button on:click={goBack} class="text-2xl border-0 bg-transparent" aria-label="뒤로 가기">←</button>
		<h1 class="text-lg font-bold">상품 관리</h1>
	</header>

	<section class="space-y-5 overflow-y-auto p-4">
		<div class="rounded-3xl bg-white p-5 shadow">
			<h2 class="text-base font-semibold text-gray-900">새 상품 추가</h2>
			{#if allowedBoothIds.length === 0}
				<p class="mt-3 rounded-2xl border border-dashed border-gray-200 px-4 py-3 text-sm text-gray-500">
					관리가 허용된 부스가 없습니다. 관리자에게 권한을 요청하세요.
				</p>
			{:else}
				<div class="mt-4 grid gap-3">
					<select
						bind:value={form.boothId}
						class="rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-100"
					>
						<option value="" disabled selected hidden>부스를 선택하세요</option>
						{#each allowedBoothIds as boothId}
							{#if boothLookup.get(boothId)}
								<option value={boothId}>
									{boothLookup.get(boothId).name} (ID {boothId})
								</option>
							{/if}
						{/each}
					</select>
					<input
						type="text"
						placeholder="상품 이름"
						bind:value={form.name}
						class="rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-100"
					/>
					<textarea
						rows="2"
						placeholder="설명 (선택)"
						bind:value={form.description}
						class="rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-100"
					/>
					<input
						type="number"
						placeholder="가격"
						bind:value={form.price}
						class="rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-100"
					/>
				</div>
				<button
					on:click={submitProduct}
					class="mt-4 w-full rounded-2xl bg-cyan-600 py-3 text-sm font-bold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-cyan-200"
					disabled={!form.boothId || !form.name || !form.price}
				>
					상품 등록
				</button>
			{/if}
		</div>

		<div class="space-y-3">
			{#if allowedProducts.length === 0}
				<p class="rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-6 text-center text-sm text-gray-500">
					관리 가능한 상품이 없습니다.
				</p>
			{:else}
				{#each allowedProducts as product (product.id)}
					<div class="rounded-2xl bg-white p-4 shadow-sm">
						<div class="flex items-start justify-between gap-3">
							<div>
								<p class="text-sm font-semibold text-gray-900">{product.name}</p>
								<p class="text-xs text-gray-500">
									{boothLookup.get(product.boothId ?? product.booth_id ?? product.booth?.id)?.name || '부스 정보 없음'}
								</p>
								<p class="mt-1 text-base font-bold text-cyan-700">{formatCurrency(product.price)}</p>
								{#if product.description}
									<p class="mt-1 text-xs text-gray-500">{product.description}</p>
								{/if}
							</div>
							<div class="flex gap-2">
								<button
									on:click={() => startEdit(product)}
									class="rounded-xl border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600"
								>
									수정
								</button>
								<button
									on:click={() => remove(product)}
									class="rounded-xl border border-red-200 px-3 py-1 text-xs font-semibold text-red-600"
								>
									삭제
								</button>
							</div>
						</div>

						{#if editingId === product.id}
							<div class="mt-4 space-y-3 rounded-2xl bg-gray-50 p-4">
								<input
									type="text"
									bind:value={editName}
									class="w-full rounded-2xl border border-gray-200 px-4 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-100"
								/>
								<textarea
									rows="2"
									bind:value={editDescription}
									class="w-full rounded-2xl border border-gray-200 px-4 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-100"
								/>
								<input
									type="number"
									bind:value={editPrice}
									class="w-full rounded-2xl border border-gray-200 px-4 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-100"
								/>
								<div class="flex gap-2">
									<button
										on:click={() => submitEdit(product)}
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
			{/if}
		</div>
	</section>
</div>

<style>
	button {
		cursor: pointer;
	}
</style>
