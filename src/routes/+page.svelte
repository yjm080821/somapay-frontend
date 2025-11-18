<script>
	import { onMount } from 'svelte';
	import HomeScreen from '$lib/components/screens/HomeScreen.svelte';
	import PaymentScreen from '$lib/components/screens/PaymentScreen.svelte';
	import HistoryScreen from '$lib/components/screens/HistoryScreen.svelte';
	import Navigation from '$lib/components/Navigation.svelte';
	import LoginScreen from '$lib/components/screens/LoginScreen.svelte';
	import * as api from '$lib/api';
	import { normalizePage } from '$lib/utils/format';

	const SESSION_KEY = 'somapay:session';

	let currentScreen = 'home';
	let session = { token: null, userId: null, role: null };
	let appReady = false;
	let loginPending = false;
	let loginError = '';
	let globalError = '';

	let userProfile = null;
	let booths = [];
	let products = [];
	let transactionsPage = normalizePage();
	let chargesPage = normalizePage();
	let adminChargesPage = normalizePage();

	let chargePending = false;
	let chargeError = '';
	let adminActionPendingId = null;

	let paymentProcessing = false;
	let paymentError = '';
	let paymentResetKey = 0;

	let historyLoading = false;

	function isBrowser() {
		return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
	}

	function isLoggedIn() {
		return Boolean(session.token && session.userId);
	}

	function isAdmin() {
		return ['ADMIN', 'MANAGER'].includes((session.role || '').toUpperCase());
	}

	function saveSession() {
		if (!isBrowser()) return;
		localStorage.setItem(SESSION_KEY, JSON.stringify(session));
	}

	function clearSessionStorage() {
		if (!isBrowser()) return;
		localStorage.removeItem(SESSION_KEY);
	}

	function resetState() {
		session = { token: null, userId: null, role: null };
		userProfile = null;
		booths = [];
		products = [];
		transactionsPage = normalizePage();
		chargesPage = normalizePage();
		adminChargesPage = normalizePage();
		globalError = '';
		chargeError = '';
		paymentError = '';
		currentScreen = 'home';
		api.clearStoredToken();
		clearSessionStorage();
		appReady = true;
	}

	async function bootstrap() {
		if (!isLoggedIn()) {
			appReady = true;
			return;
		}

		appReady = false;
		globalError = '';
		try {
			const [user, boothList, productList, txPage, chargePage] = await Promise.all([
				api.getUserById(session.userId),
				api.getBooths(),
				api.getProducts(),
				api.getTransactionsByUser(session.userId, 0),
				api.getUserCharges(session.userId, 0)
			]);

			userProfile = user;
			booths = boothList;
			products = productList;
			transactionsPage = normalizePage(txPage);
			chargesPage = normalizePage(chargePage);

			if (isAdmin()) {
				const adminPage = await api.getChargeRequests(0);
				adminChargesPage = normalizePage(adminPage);
			} else {
				adminChargesPage = normalizePage();
			}
		} catch (error) {
			globalError = error.message || '데이터를 불러오지 못했습니다.';
		} finally {
			appReady = true;
		}
	}

	async function handleLogin(event) {
		const { studentNumber, password } = event.detail;
		const parsedStudentNumber = Number(studentNumber);

		if (!studentNumber || Number.isNaN(parsedStudentNumber)) {
			loginError = '학번을 숫자로 입력해주세요.';
			return;
		}

		loginPending = true;
		loginError = '';

		try {
			const payload = await api.login({
				studentNumber: parsedStudentNumber,
				password
			});

			session = {
				token: payload.token,
				userId: payload.userId,
				role: payload.role
			};
			api.setStoredToken(payload.token);
			saveSession();
			await bootstrap();
		} catch (error) {
			loginError = error.message || '로그인에 실패했습니다.';
		} finally {
			loginPending = false;
		}
	}

	async function handleLogout() {
		try {
			if (isLoggedIn()) {
				await api.logout();
			}
		} catch {
			// ignore
		} finally {
			resetState();
		}
	}

	async function refreshUserProfile() {
		if (!isLoggedIn()) return;
		try {
			userProfile = await api.getUserById(session.userId);
		} catch (error) {
			globalError = error.message || '사용자 정보를 불러오지 못했습니다.';
		}
	}

	async function refreshTransactions(page = 0, append = false) {
		if (!isLoggedIn()) return;
		historyLoading = true;
		try {
			const response = await api.getTransactionsByUser(session.userId, page);
			const normalized = normalizePage(response);
			if (append) {
				transactionsPage = {
					...normalized,
					content: [...(transactionsPage.content ?? []), ...normalized.content],
					number: normalized.number,
					totalPages: normalized.totalPages
				};
			} else {
				transactionsPage = normalized;
			}
		} catch (error) {
			globalError = error.message || '거래 내역을 불러오지 못했습니다.';
		} finally {
			historyLoading = false;
		}
	}

	async function refreshCharges() {
		if (!isLoggedIn()) return;
		try {
			const page = await api.getUserCharges(session.userId, 0);
			chargesPage = normalizePage(page);
		} catch (error) {
			chargeError = error.message || '충전 내역을 불러오지 못했습니다.';
		}
	}

	async function refreshAdminCharges() {
		if (!isAdmin()) {
			adminChargesPage = normalizePage();
			return;
		}

		try {
			const page = await api.getChargeRequests(0);
			adminChargesPage = normalizePage(page);
		} catch (error) {
			globalError = error.message || '충전 요청을 불러오지 못했습니다.';
		}
	}

	async function handleChargeRequest(event) {
		const amount = event.detail;
		if (!amount) return;

		chargePending = true;
		chargeError = '';
		try {
			await api.requestCharge(session.userId, amount);
			await refreshCharges();
			if (isAdmin()) {
				await refreshAdminCharges();
			}
		} catch (error) {
			chargeError = error.message || '충전 요청에 실패했습니다.';
		} finally {
			chargePending = false;
		}
	}

	async function handleApproveCharge(event) {
		const id = event.detail;
		if (!id) return;
		adminActionPendingId = id;
		try {
			await api.approveCharge(id);
			await Promise.all([refreshCharges(), refreshAdminCharges(), refreshUserProfile()]);
		} catch (error) {
			globalError = error.message || '충전 승인에 실패했습니다.';
		} finally {
			adminActionPendingId = null;
		}
	}

	async function handleRejectCharge(event) {
		const id = event.detail;
		if (!id) return;
		adminActionPendingId = id;
		try {
			await api.rejectCharge(id);
			await refreshAdminCharges();
		} catch (error) {
			globalError = error.message || '충전 거절에 실패했습니다.';
		} finally {
			adminActionPendingId = null;
		}
	}

	async function refreshProducts() {
		try {
			products = await api.getProducts();
		} catch (error) {
			globalError = error.message || '메뉴 정보를 불러오지 못했습니다.';
		}
	}

	async function handlePayment(event) {
		const { items, pin } = event.detail;
		if (!items?.length) return;

		paymentProcessing = true;
		paymentError = '';

		try {
			for (const item of items) {
				await api.createTransaction(session.userId, {
					pin,
					productId: item.productId,
					quantity: item.quantity
				});
			}

			paymentResetKey += 1;
			await Promise.all([
				refreshUserProfile(),
				refreshTransactions(0),
				refreshCharges(),
				refreshProducts()
			]);

			currentScreen = 'home';
		} catch (error) {
			paymentError = error.message || '결제에 실패했습니다.';
		} finally {
			paymentProcessing = false;
		}
	}

	function handleNav(event) {
		currentScreen = event.detail;
	}

	function loadMoreHistory() {
		const nextPage = (transactionsPage.number ?? 0) + 1;
		if (nextPage >= (transactionsPage.totalPages ?? 0)) {
			return;
		}
		refreshTransactions(nextPage, true);
	}

	onMount(() => {
		if (!isBrowser()) {
			appReady = true;
			return;
		}

		const raw = localStorage.getItem(SESSION_KEY);
		if (raw) {
			try {
				const stored = JSON.parse(raw);
				if (stored.token) {
					session = stored;
					api.setStoredToken(stored.token);
					bootstrap();
					return;
				}
			} catch {
				// ignore parse error
			}
		}

		appReady = true;
	});
</script>

{#if !isLoggedIn()}
	<LoginScreen on:login={handleLogin} {loginPending} error={loginError} />
{:else if !appReady}
	<div class="flex min-h-screen items-center justify-center bg-gray-50">
		<p class="rounded-xl bg-white px-6 py-3 text-sm text-gray-600 shadow">데이터 불러오는 중...</p>
	</div>
{:else}
	<main class="flex h-screen flex-col bg-gray-50">
		{#if globalError}
			<div class="bg-red-50 px-4 py-2 text-center text-sm text-red-600">{globalError}</div>
		{/if}

		<div class="flex-1 overflow-y-auto">
			{#if currentScreen === 'home'}
				<HomeScreen
					user={userProfile}
					transactions={transactionsPage.content}
					charges={chargesPage.content}
					chargeRequests={adminChargesPage.content}
					role={session.role}
					{chargePending}
					{chargeError}
					{adminActionPendingId}
					on:navigate={handleNav}
					on:requestCharge={(e) => handleChargeRequest(e)}
					on:approveCharge={(e) => handleApproveCharge(e)}
					on:rejectCharge={(e) => handleRejectCharge(e)}
					on:logout={handleLogout}
				/>
			{:else if currentScreen === 'payment'}
				<PaymentScreen
					{booths}
					{products}
					processing={paymentProcessing}
					error={paymentError}
					{paymentResetKey}
					on:navigate={handleNav}
					on:checkout={handlePayment}
				/>
			{:else if currentScreen === 'history'}
				<HistoryScreen
					transactions={transactionsPage.content}
					loading={historyLoading}
					canLoadMore={(transactionsPage.number ?? 0) + 1 < (transactionsPage.totalPages ?? 0)}
					on:navigate={handleNav}
					on:refresh={() => refreshTransactions(0)}
					on:loadMore={loadMoreHistory}
				/>
			{/if}
		</div>

		<Navigation {currentScreen} on:navigate={handleNav} />
	</main>
{/if}

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		background: #f8fafc;
		font-family:
			-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
	}
</style>
