<script>
	import { createEventDispatcher } from 'svelte';
	import BoothScreen from '../BoothScreen.svelte';
	import MenuScreen from '../MenuScreen.svelte';
	import { formatCurrency } from '$lib/utils/format';

	export let booths = [];
	export let products = [];
	export let processing = false;
	export let error = '';
	export let paymentResetKey = 0;

	const dispatch = createEventDispatcher();

	let currentView = 'booths';
	let selectedBooth = null;
	let selectedItems = [];
	let checkoutPin = '';
	let localError = '';
	let lastResetKey = paymentResetKey;

	$: boothMenus = selectedBooth
		? products.filter((product) => product.boothId === selectedBooth.id)
		: [];

	$: totalPrice = selectedItems.reduce((sum, item) => sum + (item.price ?? 0) * item.quantity, 0);

	$: if (paymentResetKey !== lastResetKey) {
		lastResetKey = paymentResetKey;
		resetView();
	}

	function resetView() {
		currentView = 'booths';
		selectedBooth = null;
		selectedItems = [];
		checkoutPin = '';
		localError = '';
	}

	function goBack() {
		if (currentView === 'checkout') {
			currentView = 'menu';
			return;
		}

		if (currentView === 'menu') {
			resetView();
			return;
		}

		dispatch('navigate', 'home');
	}

	function selectBooth(booth) {
		selectedBooth = booth;
		selectedItems = [];
		currentView = 'menu';
	}

	function addItem(product) {
		const key = `${selectedBooth?.id ?? ''}-${product.id}`;
		const existing = selectedItems.find((item) => item.key === key);

		if (existing) {
			existing.quantity += 1;
			selectedItems = [...selectedItems];
			return;
		}

		selectedItems = [
			...selectedItems,
			{
				key,
				productId: product.id,
				name: product.name,
				price: product.price,
				quantity: 1
			}
		];
	}

	function updateQuantity(productId, quantity) {
		if (quantity <= 0) {
			removeItem(productId);
			return;
		}

		const key = `${selectedBooth?.id ?? ''}-${productId}`;
		selectedItems = selectedItems.map((item) => (item.key === key ? { ...item, quantity } : item));
	}

	function removeItem(productId) {
		const key = `${selectedBooth?.id ?? ''}-${productId}`;
		selectedItems = selectedItems.filter((item) => item.key !== key);
	}

	function goToCheckout() {
		localError = '';
		if (!selectedItems.length) {
			localError = '메뉴를 선택해주세요.';
			return;
		}

		currentView = 'checkout';
	}

	function submitPayment() {
		localError = '';
		if (!checkoutPin || checkoutPin.length < 4) {
			localError = '4자리 이상의 PIN을 입력해주세요.';
			return;
		}

		dispatch('checkout', {
			booth: selectedBooth,
			items: selectedItems,
			pin: checkoutPin
		});
	}
</script>

<div class="flex h-full flex-col bg-gray-50">
	{#if currentView === 'booths'}
		<BoothScreen {booths} on:back={goBack} on:selectBooth={(e) => selectBooth(e.detail)} />
	{:else if currentView === 'menu'}
		<MenuScreen
			booth={selectedBooth}
			menus={boothMenus}
			{selectedItems}
			on:back={goBack}
			on:addItem={(e) => addItem(e.detail)}
			on:updateQuantity={(e) => updateQuantity(e.detail.itemId, e.detail.quantity)}
			on:checkout={goToCheckout}
		/>
	{:else if currentView === 'checkout'}
		<div class="flex flex-1 flex-col">
			<div class="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
				<button on:click={goBack} class="text-2xl" aria-label="뒤로 가기">←</button>
				<h1 class="flex-1 text-lg font-bold">결제 확인</h1>
			</div>

			<div class="flex-1 space-y-4 overflow-y-auto p-4">
				<div class="rounded-xl bg-white p-4 shadow">
					<h2 class="text-base font-bold text-gray-900">{selectedBooth?.name}</h2>
				</div>

				<div class="rounded-xl bg-white p-4 shadow">
					<h3 class="mb-3 text-sm font-semibold text-gray-700">주문 내역</h3>
					<div class="space-y-2">
						{#each selectedItems as item (item.key)}
							<div class="flex items-center justify-between border-b pb-2">
								<div>
									<p class="text-sm font-semibold text-gray-900">{item.name}</p>
									<p class="text-xs text-gray-500">{item.quantity}개</p>
								</div>
								<p class="text-sm font-bold text-gray-900">
									{formatCurrency((item.price ?? 0) * item.quantity)}
								</p>
							</div>
						{/each}
					</div>
				</div>

				<div class="rounded-xl bg-white p-4 shadow">
					<label class="text-sm font-semibold text-gray-700" for="checkout-pin">PIN 인증</label>
					<input
						id="checkout-pin"
						type="password"
						inputmode="numeric"
						maxlength="6"
						placeholder="결제 PIN을 입력해주세요"
						bind:value={checkoutPin}
						class="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 focus:outline-none"
						disabled={processing}
					/>
				</div>

				<div class="rounded-xl bg-cyan-600 p-4 text-white shadow">
					<p class="text-sm opacity-90">총 결제 금액</p>
					<p class="mt-1 text-3xl font-bold">{formatCurrency(totalPrice)}</p>
				</div>

				{#if localError}
					<p class="text-sm text-red-500">{localError}</p>
				{:else if error}
					<p class="text-sm text-red-500">{error}</p>
				{/if}
			</div>

			<div class="border-t border-gray-100 bg-white p-4">
				<button
					on:click={submitPayment}
					class="w-full rounded-xl bg-cyan-600 py-3 text-base font-bold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-cyan-200"
					disabled={processing}
				>
					{processing ? '결제 중...' : '결제하기'}
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	button {
		border: none;
		background: none;
		cursor: pointer;
	}
</style>
