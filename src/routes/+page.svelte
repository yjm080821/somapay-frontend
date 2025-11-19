<script>
	import { onMount } from 'svelte';
	import HomeScreen from '$lib/components/screens/HomeScreen.svelte';
	import PaymentScreen from '$lib/components/screens/PaymentScreen.svelte';
	import HistoryScreen from '$lib/components/screens/HistoryScreen.svelte';
	import ChargeScreen from '$lib/components/screens/ChargeScreen.svelte';
	import ChargeRequestsScreen from '$lib/components/screens/ChargeRequestsScreen.svelte';
	import SpendingScreen from '$lib/components/screens/SpendingScreen.svelte';
	import IncomeScreen from '$lib/components/screens/IncomeScreen.svelte';
	import AdminChargeScreen from '$lib/components/screens/AdminChargeScreen.svelte';
	import BoothManagementScreen from '$lib/components/screens/BoothManagementScreen.svelte';
	import ProductManagementScreen from '$lib/components/screens/ProductManagementScreen.svelte';
	import CredentialsScreen from '$lib/components/screens/CredentialsScreen.svelte';
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
	let credentialsPending = false;
	let credentialFeedback = '';
	let boothOwnerMap = new Map();

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

	function getTxTimestamp(tx) {
		return (
			tx?.timestamp ||
			tx?.createdAt ||
			tx?.updatedAt ||
			tx?.created_at ||
			tx?.updated_at ||
			null
		);
	}

	function getTxUserId(tx) {
		const candidate =
			tx?.userId ??
			tx?.user_id ??
			tx?.userID ??
			tx?.user?.id ??
			tx?.edges?.user?.id ??
			null;
		return candidate === null || candidate === undefined ? null : Number(candidate);
	}

	function getTxBoothId(tx) {
		const candidate =
			tx?.boothId ??
			tx?.booth_id ??
			tx?.boothID ??
			tx?.booth?.id ??
			tx?.edges?.booth?.id ??
			null;
		return candidate === null || candidate === undefined ? null : Number(candidate);
	}

	function getBoothOwnerIdFromTx(tx) {
		const direct =
			tx?.boothOwnerId ??
			tx?.booth_owner_id ??
			tx?.booth?.userId ??
			tx?.booth?.user_id ??
			tx?.booth?.user?.id ??
			tx?.edges?.booth?.user?.id ??
			tx?.edges?.booth?.edges?.user?.id ??
			null;
		if (direct !== null && direct !== undefined) {
			return Number(direct);
		}
		const boothId = getTxBoothId(tx);
		if (!boothId) return null;
		const mapped = boothOwnerMap.get(boothId);
		return mapped === undefined ? null : Number(mapped);
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
	$: boothOwnerMap = new Map(
		(booths || [])
			.map((booth) => {
				const boothId = booth?.id ?? booth?.boothId ?? booth?.booth_id;
				if (boothId === undefined || boothId === null) {
					return null;
				}
				const owner =
					booth?.userId ??
					booth?.user_id ??
					booth?.user?.id ??
					booth?.edges?.user?.id ??
					null;
				const normalizedOwner =
					owner === undefined || owner === null ? null : Number(owner);
				return [Number(boothId), normalizedOwner];
			})
			.filter(Boolean)
	);
	$: sortedTransactions = Array.isArray(transactions)
		? [...transactions].sort((a, b) => {
				const left = new Date(getTxTimestamp(b) || 0).getTime();
				const right = new Date(getTxTimestamp(a) || 0).getTime();
				return left - right;
		  })
		: [];
	$: spendingTransactions = sortedTransactions.filter((tx) => {
		if (!session.userId) return false;
		const buyerId = getTxUserId(tx);
		return buyerId !== null && buyerId === Number(session.userId);
	});
	$: hostTransactions = sortedTransactions.filter((tx) => {
		if (!isHostRole && !isAdminRole) {
			return false;
		}
		if (isAdminRole) {
			return true;
		}
		if (!session.userId) {
			return false;
		}
		const ownerId = getBoothOwnerIdFromTx(tx);
		return ownerId !== null && ownerId === Number(session.userId);
	});
	$: incomeTotal = hostTransactions.reduce((sum, tx) => sum + Number(tx?.amount ?? 0), 0);

	function saveSession() {
		if (!isBrowser()) return;
		localStorage.setItem(SESSION_KEY, JSON.stringify(session));
	}

	function clearSessionStorage() {
		if (!isBrowser()) return;
		localStorage.removeItem(SESSION_KEY);
	}

	function isTokenError(error) {
		return (
			error?.status === 401 ||
			error?.code === 'TOKEN_EXPIRED' ||
			/(invalid token|unauthorized)/i.test(error?.message || '')
		);
	}

	function handleAuthError(error) {
		if (isTokenError(error)) {
			loginError = '세션이 만료되었습니다. 다시 로그인해주세요.';
			resetState();
			return true;
		}
		return false;
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
		credentialsPending = false;
		credentialFeedback = '';
		boothOwnerMap = new Map();
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
					.catch((error) => {
						if (handleAuthError(error)) {
							throw error;
						}
						return null;
					})
			)
		);

		userChargeRequests = results.filter(Boolean);
	}

	async function refreshBoothsAndProducts() {
		menuError = '';
		try {
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
		} catch (error) {
			if (handleAuthError(error)) {
				return;
			}
			menuError = error.message || '메뉴 정보를 불러오지 못했습니다.';
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
			if (handleAuthError(error)) {
				return;
			}
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
			if (handleAuthError(error)) {
				return;
			}
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
			if (handleAuthError(error)) {
				return;
			}
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
			if (handleAuthError(error)) {
				return;
			}
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
			if (handleAuthError(error)) {
				return;
			}
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
			if (handleAuthError(error)) {
				return;
			}
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
			if (handleAuthError(error)) {
				return;
			}
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
			if (handleAuthError(error)) {
				return;
			}
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
			if (handleAuthError(error)) {
				return;
			}
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
			if (handleAuthError(error)) {
				return;
			}
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
			if (handleAuthError(error)) {
				return;
			}
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
			if (handleAuthError(error)) {
				return;
			}
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
					if (!handleAuthError(error)) {
						menuError = error.message || '메뉴 정보를 불러오지 못했습니다.';
					}
				})
			]);

			currentScreen = 'home';
		} catch (error) {
			if (handleAuthError(error)) {
				return;
			}
			paymentError = error.message || '결제에 실패했습니다.';
		} finally {
			paymentProcessing = false;
		}
	}

	async function handleUpdateCredentials(event) {
		const { password, pin } = event.detail || {};
		if (!session.userId) {
			globalError = '사용자 정보를 확인할 수 없습니다.';
			return;
		}
		const payload = {};
		if (password && password.trim()) {
			payload.password = password.trim();
		}
		if (pin && pin.trim()) {
			payload.pin = pin.trim();
		}
		if (!Object.keys(payload).length) {
			return;
		}

		globalError = '';
		credentialFeedback = '';
		credentialsPending = true;

		try {
			await api.updateUser(session.userId, payload);
			await refreshUserProfile();
			credentialFeedback = '비밀번호/PIN이 변경되었습니다.';
		} catch (error) {
			if (handleAuthError(error)) {
				return;
			}
			globalError = error.message || '비밀번호/PIN 변경에 실패했습니다.';
		} finally {
			credentialsPending = false;
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
					role={roleLabel}
					isAdmin={isAdminRole}
					isHost={isHostRole}
					on:navigate={handleNav}
					on:logout={handleLogout}
				/>
			{:else if currentScreen === 'charge'}
				<ChargeScreen
					pending={chargePending}
					error={chargeError}
					on:navigate={handleNav}
					on:requestCharge={handleChargeRequest}
				/>
			{:else if currentScreen === 'charge-requests'}
				<ChargeRequestsScreen
					requests={userChargeRequests}
					on:navigate={handleNav}
				/>
			{:else if currentScreen === 'spending'}
				<SpendingScreen transactions={spendingTransactions} on:navigate={handleNav} />
			{:else if currentScreen === 'income'}
				<IncomeScreen
					transactions={hostTransactions}
					total={incomeTotal}
					on:navigate={handleNav}
				/>
			{:else if currentScreen === 'admin-charges'}
				<AdminChargeScreen
					requests={adminChargeRequests}
					pendingId={adminActionPendingId}
					on:navigate={handleNav}
					on:approveCharge={handleApproveCharge}
					on:rejectCharge={handleRejectCharge}
				/>
			{:else if currentScreen === 'booth-management'}
				<BoothManagementScreen
					booths={booths}
					on:navigate={handleNav}
					on:createBooth={handleCreateBooth}
					on:updateBooth={handleUpdateBooth}
					on:deleteBooth={handleDeleteBooth}
				/>
			{:else if currentScreen === 'product-management'}
				<ProductManagementScreen
					{booths}
					{products}
					user={userProfile}
					isAdmin={isAdminRole}
					isHost={isHostRole}
					on:navigate={handleNav}
					on:createProduct={handleCreateProduct}
					on:updateProduct={handleUpdateProduct}
					on:deleteProduct={handleDeleteProduct}
				/>
			{:else if currentScreen === 'credentials'}
				<CredentialsScreen
					pending={credentialsPending}
					message={credentialFeedback}
					on:navigate={handleNav}
					on:updateCredentials={handleUpdateCredentials}
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
