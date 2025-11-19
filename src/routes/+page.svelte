<script>
	import { onMount } from 'svelte';
	import HomeScreen from '$lib/components/screens/HomeScreen.svelte';
	import PaymentScreen from '$lib/components/screens/PaymentScreen.svelte';
	import HistoryScreen from '$lib/components/screens/HistoryScreen.svelte';
	import Navigation from '$lib/components/Navigation.svelte';
	import LoginScreen from '$lib/components/screens/LoginScreen.svelte';
	import * as api from '$lib/api';

	const SESSION_KEY = 'somapay:session';
	const CHARGE_CACHE_KEY = 'somapay:charge-ids';

	let currentScreen = 'home';
	let session = { token: null, userId: null, username: null, role: null };
	let loggedIn = false;
	let appReady = false;
	let loginPending = false;
	let loginError = '';
	let globalError = '';

	let userProfile = null;
	let booths = [];
	let products = [];
	let menuError = '';
	let roleLabel = 'USER';
	let normalizedRole = 'USER';
	let isAdminRole = false;
	let isHostRole = false;

	let transactions = [];
	let userChargeRequests = [];
	let adminChargeRequests = [];

	let chargePending = false;
	let chargeError = '';
	let adminActionPendingId = null;

	let paymentProcessing = false;
	let paymentError = '';
	let paymentResetKey = 0;

	let historyLoading = false;

	const normalizeStatus = (status) => (status || '').toUpperCase();
	const filterPending = (requests) =>
		Array.isArray(requests)
			? requests.filter((request) => normalizeStatus(request.status) === 'PENDING')
			: [];

	function isBrowser() {
		return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
	}

	function readChargeCache() {
		if (!isBrowser()) return {};
		const raw = localStorage.getItem(CHARGE_CACHE_KEY);
		if (!raw) return {};
		try {
			return JSON.parse(raw) || {};
		} catch {
			return {};
		}
	}

	function persistChargeCache(map) {
		if (!isBrowser()) return;
		localStorage.setItem(CHARGE_CACHE_KEY, JSON.stringify(map));
	}

	function getStoredChargeIds() {
		if (!session.username) return [];
		const map = readChargeCache();
		return map[session.username] ?? [];
	}

	function addChargeId(id) {
		if (!session.username || !id) return;
		const map = readChargeCache();
		const existing = map[session.username] ?? [];
		if (!existing.includes(id)) {
			map[session.username] = [...existing, id];
			persistChargeCache(map);
		}
	}

	$: loggedIn = Boolean(session.token);

	function currentRole() {
		return roleLabel;
	}

	function isAdmin() {
		return (currentRole() || '').toUpperCase() === 'ADMIN';
	}

	$: roleLabel = userProfile?.role || session.role || 'USER';
	$: normalizedRole = (roleLabel || '').toUpperCase();
	$: isAdminRole = normalizedRole === 'ADMIN';
	$: isHostRole = normalizedRole === 'HOST';

	function saveSession() {
		if (!isBrowser()) return;
		localStorage.setItem(SESSION_KEY, JSON.stringify(session));
	}

	function clearSessionStorage() {
		if (!isBrowser()) return;
		localStorage.removeItem(SESSION_KEY);
	}

	function resetState() {
		session = { token: null, userId: null, username: null, role: null };
		userProfile = null;
		booths = [];
		products = [];
		menuError = '';
		transactions = [];
		userChargeRequests = [];
		adminChargeRequests = [];
		chargePending = false;
		chargeError = '';
		adminActionPendingId = null;
		paymentProcessing = false;
		paymentError = '';
		paymentResetKey = 0;
		historyLoading = false;
		currentScreen = 'home';
		globalError = '';
		api.clearStoredToken();
		clearSessionStorage();
		appReady = true;
	}

	async function ensureUserProfile(transactionsSnapshot = []) {
		if (!session.token) return;

		const assignUser = (user) => {
			if (!user) return;
			userProfile = user;
			session.userId = user.id;
			session.username = session.username || user.username;
			session.role = user.role;
		};

		if (session.userId) {
			try {
				const user = await api.getUser(session.userId);
				assignUser(user);
				return;
			} catch {
				session.userId = null;
			}
		}

		const numericCandidate = Number(session.username);
		if (!Number.isNaN(numericCandidate) && numericCandidate > 0) {
			try {
				const user = await api.getUser(numericCandidate);
				assignUser(user);
				return;
			} catch {
				// ignore and fall through
			}
		}

		const ownedTx = (transactionsSnapshot || []).find(
			(tx) => tx?.edges?.user?.username === session.username
		);
		if (ownedTx?.edges?.user) {
			assignUser(ownedTx.edges.user);
			return;
		}

		throw new Error('사용자 정보를 확인할 수 없습니다.');
	}

	async function loadUserChargeRequests() {
		const ids = getStoredChargeIds();
		if (!ids.length) {
			userChargeRequests = [];
			return;
		}

		const results = await Promise.all(
			ids.map((id) =>
				api
					.getChargeRequest(id)
					.then((data) => data)
					.catch(() => null)
			)
		);

		userChargeRequests = results.filter(Boolean);
	}

	async function refreshBoothsAndProducts() {
		menuError = '';
		const boothList = await api.listBooths();
		booths = boothList;

		const aggregated = [];
		const boothErrors = [];

		for (const booth of boothList) {
			try {
				const boothProducts = await api.listProductsByBooth(booth.id);
				const normalized = (boothProducts || []).map((product) => ({
					...product,
					boothId: booth.id
				}));
				aggregated.push(...normalized);
			} catch (error) {
				boothErrors.push(`${booth.name || `부스 ${booth.id}`}: ${error.message}`);
			}
		}

		products = aggregated;

		if (boothErrors.length) {
			menuError = `일부 메뉴를 불러오지 못했습니다. (${boothErrors.join(', ')})`;
		}
	}

	async function bootstrap() {
		const activeToken = session.token || api.getStoredToken();
		if (!activeToken) {
			appReady = true;
			return;
		}
		if (!session.token) {
			session = { ...session, token: activeToken };
		}

		appReady = false;
		globalError = '';

		try {
			const transactionsPromise = api.listTransactions();
			await refreshBoothsAndProducts();
			const txList = await transactionsPromise;

			transactions = Array.isArray(txList) ? txList : [];

			await ensureUserProfile(transactions);
			await loadUserChargeRequests();

			if (isAdmin()) {
				try {
					const list = await api.listChargeRequests();
					adminChargeRequests = filterPending(list);
				} catch (error) {
					globalError = error.message || '충전 요청을 불러오지 못했습니다.';
				}
			} else {
				adminChargeRequests = [];
			}
		} catch (error) {
			globalError = error.message || '데이터를 불러오지 못했습니다.';
		} finally {
			saveSession();
			appReady = true;
		}
	}

	async function refreshUserProfile() {
		const activeToken = session.token || api.getStoredToken();
		if (!activeToken) return;
		if (!session.token) {
			session = { ...session, token: activeToken };
		}
		try {
			if (!session.userId) {
				await ensureUserProfile(transactions);
			} else {
				const user = await api.getUser(session.userId);
				userProfile = user;
				session.role = user?.role || session.role;
			}
			saveSession();
		} catch (error) {
			globalError = error.message || '사용자 정보를 불러오지 못했습니다.';
		}
	}

	async function refreshTransactions() {
		const activeToken = session.token || api.getStoredToken();
		if (!activeToken) return;
		if (!session.token) {
			session = { ...session, token: activeToken };
		}
		historyLoading = true;
		try {
			const list = await api.listTransactions();
			transactions = Array.isArray(list) ? list : [];
		} catch (error) {
			globalError = error.message || '거래 내역을 불러오지 못했습니다.';
		} finally {
			historyLoading = false;
		}
	}

	async function refreshAdminCharges() {
		if (!isAdmin()) {
			adminChargeRequests = [];
			return;
		}

		try {
			const list = await api.listChargeRequests();
			adminChargeRequests = filterPending(list);
		} catch (error) {
			globalError = error.message || '충전 요청을 불러오지 못했습니다.';
		}
	}

	async function handleLogin(event) {
		const { studentNumber, password } = event.detail;
		if (!studentNumber || !password) {
			loginError = '학번과 비밀번호를 모두 입력해주세요.';
			return;
		}

		loginPending = true;
		loginError = '';

		try {
			const payload = await api.login({ studentNumber, password });
			session = {
				token: payload.token,
				userId: payload.userId ?? null,
				username: studentNumber,
				role: null
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

	function handleLogout() {
		resetState();
	}

	async function handleChargeRequest(event) {
		const amount = event.detail;
		if (!amount) return;

		chargePending = true;
		chargeError = '';

		try {
			const response = await api.createChargeRequest(amount);
			userChargeRequests = [response, ...userChargeRequests];
			addChargeId(response.id);
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
			await api.updateChargeRequest(id, 'APPROVED');
			adminChargeRequests = adminChargeRequests.filter((request) => request.id !== id);
			await Promise.all([refreshUserProfile(), loadUserChargeRequests(), refreshAdminCharges()]);
		} catch (error) {
			globalError = error.message || '충전 승인 중 오류가 발생했습니다.';
		} finally {
			adminActionPendingId = null;
		}
	}

	async function handleRejectCharge(event) {
		const id = event.detail;
		if (!id) return;
		adminActionPendingId = id;
		try {
			await api.updateChargeRequest(id, 'REJECTED');
			adminChargeRequests = adminChargeRequests.filter((request) => request.id !== id);
			await refreshAdminCharges();
		} catch (error) {
			globalError = error.message || '충전 거절 중 오류가 발생했습니다.';
		} finally {
			adminActionPendingId = null;
		}
	}

	async function handleCreateBooth(event) {
		const { name, userId } = event.detail || {};
		if (!name || !userId) {
			return;
		}
		globalError = '';
		try {
			await api.createBooth({
				name: name.trim(),
				user_id: Number(userId)
			});
			await refreshBoothsAndProducts();
		} catch (error) {
			globalError = error.message || '부스를 생성하지 못했습니다.';
		}
	}

	async function handleUpdateBooth(event) {
		const { id, name, userId } = event.detail || {};
		if (!id) return;
		const payload = {};
		if (name && name.trim()) {
			payload.name = name.trim();
		}
		if (userId) {
			payload.user_id = Number(userId);
		}
		if (!Object.keys(payload).length) {
			return;
		}
		globalError = '';
		try {
			await api.updateBooth(id, payload);
			await refreshBoothsAndProducts();
		} catch (error) {
			globalError = error.message || '부스를 수정하지 못했습니다.';
		}
	}

	async function handleDeleteBooth(event) {
		const { id } = event.detail || {};
		if (!id) return;
		globalError = '';
		try {
			await api.deleteBooth(id);
			await refreshBoothsAndProducts();
		} catch (error) {
			globalError = error.message || '부스를 삭제하지 못했습니다.';
		}
	}

	async function handleCreateProduct(event) {
		const { boothId, name, description, price } = event.detail || {};
		if (!boothId || !name || price === '') {
			return;
		}
		globalError = '';
		try {
			await api.createProduct({
				booth_id: Number(boothId),
				name: name.trim(),
				description: description?.trim() || '',
				price: Number(price)
			});
			await refreshBoothsAndProducts();
		} catch (error) {
			globalError = error.message || '상품을 생성하지 못했습니다.';
		}
	}

	async function handleUpdateProduct(event) {
		const { id, name, description, price } = event.detail || {};
		if (!id) return;
		const payload = {};
		if (name !== undefined) {
			const trimmed = name.trim();
			if (trimmed) {
				payload.name = trimmed;
			}
		}
		if (description !== undefined) {
			payload.description = description.trim();
		}
		if (price !== undefined && price !== '') {
			payload.price = Number(price);
		}
		if (!Object.keys(payload).length) {
			return;
		}
		globalError = '';
		try {
			await api.updateProduct(id, payload);
			await refreshBoothsAndProducts();
		} catch (error) {
			globalError = error.message || '상품을 수정하지 못했습니다.';
		}
	}

	async function handleDeleteProduct(event) {
		const { id } = event.detail || {};
		if (!id) return;
		globalError = '';
		try {
			await api.deleteProduct(id);
			await refreshBoothsAndProducts();
		} catch (error) {
			globalError = error.message || '상품을 삭제하지 못했습니다.';
		}
	}

	async function handlePayment(event) {
		const { items, pin } = event.detail;
		if (!items?.length) return;

		paymentProcessing = true;
		paymentError = '';

		try {
			for (const item of items) {
				await api.createTransaction({
					product_id: item.productId ?? item.id,
					quantity: item.quantity,
					pin
				});
			}

			paymentResetKey += 1;

			await Promise.all([
				refreshUserProfile(),
				refreshTransactions(),
				loadUserChargeRequests(),
				refreshBoothsAndProducts().catch((error) => {
					menuError = error.message || '메뉴 정보를 불러오지 못했습니다.';
				})
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
				// ignore parse errors
			}
		}

		const storedToken = api.getStoredToken();
		if (storedToken) {
			session = { ...session, token: storedToken };
			bootstrap();
			return;
		}

		appReady = true;
	});
</script>

{#if !loggedIn}
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

		{#if menuError}
			<div class="bg-amber-50 px-4 py-2 text-center text-xs text-amber-900">{menuError}</div>
		{/if}

		<div class="flex-1 overflow-y-auto">
			{#if currentScreen === 'home'}
				<HomeScreen
					user={userProfile}
					{transactions}
					charges={userChargeRequests}
					chargeRequests={adminChargeRequests}
					role={roleLabel}
					{booths}
					{products}
					isAdmin={isAdminRole}
					isHost={isHostRole}
					{chargePending}
					{chargeError}
					{adminActionPendingId}
					on:navigate={handleNav}
					on:requestCharge={handleChargeRequest}
					on:approveCharge={handleApproveCharge}
					on:rejectCharge={handleRejectCharge}
					on:logout={handleLogout}
					on:createBooth={handleCreateBooth}
					on:updateBooth={handleUpdateBooth}
					on:deleteBooth={handleDeleteBooth}
					on:createProduct={handleCreateProduct}
					on:updateProduct={handleUpdateProduct}
					on:deleteProduct={handleDeleteProduct}
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
					{transactions}
					loading={historyLoading}
					on:navigate={handleNav}
					on:refresh={refreshTransactions}
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
