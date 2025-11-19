<script>
	import { createEventDispatcher } from 'svelte';

	export let pending = false;
	export let error = '';

	const dispatch = createEventDispatcher();

	let studentNumber = '';
	let password = '';

	function handleSubmit(event) {
		event.preventDefault();
		if (!studentNumber || !password) {
			return;
		}

		dispatch('login', {
			studentNumber,
			password
		});
	}
</script>

<div class="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6">
	<div class="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
		<div class="mb-8 text-center">
			<p class="text-sm font-medium text-gray-500">소마페이 관리자</p>
			<h1 class="mt-2 text-2xl font-bold text-gray-900">서비스에 로그인하세요</h1>
		</div>

		<form class="space-y-5" on:submit={handleSubmit}>
			<div>
				<label class="mb-2 block text-sm font-semibold text-gray-700" for="student-number">
					학번
				</label>
				<input
					id="student-number"
					type="text"
					name="student-number"
					placeholder="예) 2501"
					bind:value={studentNumber}
					class="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm shadow-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 focus:outline-none"
					autocomplete="username"
					disabled={pending}
				/>
			</div>

			<div>
				<label class="mb-2 block text-sm font-semibold text-gray-700" for="password">
					비밀번호
				</label>
				<input
					id="password"
					type="password"
					name="password"
					placeholder="비밀번호를 입력해주세요"
					bind:value={password}
					class="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm shadow-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 focus:outline-none"
					autocomplete="current-password"
					disabled={pending}
				/>
			</div>

			{#if error}
				<p class="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>
			{/if}

			<button
				type="submit"
				class="w-full rounded-xl bg-cyan-500 py-3 text-sm font-bold text-white transition-all hover:bg-cyan-600 active:scale-95 disabled:cursor-not-allowed disabled:bg-cyan-200"
				disabled={pending || !studentNumber || !password}
			>
				{pending ? '로그인 중...' : '로그인'}
			</button>
		</form>
	</div>
</div>
