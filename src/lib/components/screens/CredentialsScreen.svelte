<script>
	import { createEventDispatcher } from 'svelte';

	export let pending = false;
	export let message = '';

	const dispatch = createEventDispatcher();

	let password = '';
	let pin = '';
	let localError = '';

	function goBack() {
		dispatch('navigate', 'home');
	}

	function submit() {
		localError = '';
		if (!password.trim() && !pin.trim()) {
			localError = '변경할 비밀번호 또는 PIN을 입력해주세요.';
			return;
		}
		dispatch('updateCredentials', {
			password: password.trim(),
			pin: pin.trim()
		});
		password = '';
		pin = '';
	}
</script>

<div class="flex h-full flex-col bg-gray-50">
	<header class="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
		<button on:click={goBack} class="text-2xl" aria-label="뒤로 가기">←</button>
		<h1 class="text-lg font-bold">비밀번호 / PIN 변경</h1>
	</header>

	<section class="space-y-4 overflow-y-auto p-4">
		<div class="rounded-3xl bg-white p-5 shadow">
			<div class="space-y-4">
				<div>
					<label class="text-sm font-semibold text-gray-700" for="password">새 비밀번호</label>
					<input
						id="password"
						type="password"
						placeholder="비밀번호 입력"
						bind:value={password}
						class="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-100"
						autocomplete="new-password"
					/>
				</div>

				<div>
					<label class="text-sm font-semibold text-gray-700" for="pin">새 PIN</label>
					<input
						id="pin"
						type="password"
						inputmode="numeric"
						maxlength="6"
						placeholder="PIN 입력"
						bind:value={pin}
						class="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-100"
					/>
				</div>
			</div>

			{#if localError}
				<p class="mt-3 text-sm text-red-500">{localError}</p>
			{:else if message}
				<p class="mt-3 text-sm text-emerald-600">{message}</p>
			{/if}

			<button
				on:click={submit}
				class="mt-6 w-full rounded-2xl bg-cyan-600 py-3 text-sm font-bold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-cyan-200"
				disabled={pending}
			>
				{pending ? '변경 중...' : '변경하기'}
			</button>
		</div>
	</section>
</div>

<style>
	button {
		border: none;
		cursor: pointer;
		background: none;
	}
</style>
