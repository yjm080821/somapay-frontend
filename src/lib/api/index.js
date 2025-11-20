import {
	apiRequest,
	getStoredToken,
	setStoredToken,
	clearStoredToken,
	API_BASE_URL
} from './client';

export { API_BASE_URL, getStoredToken, setStoredToken, clearStoredToken };

export const login = ({ studentNumber, password }) =>
	apiRequest('/login', {
		method: 'POST',
		data: {
			student_number: studentNumber,
			password
		},
		auth: false
	});

export const createUser = (payload) => apiRequest('/users', { method: 'POST', data: payload });

export const getUser = (id) => apiRequest(`/users/${id}`);

export const updateUser = (id, payload) =>
	apiRequest(`/users/${id}`, { method: 'PATCH', data: payload });

function buildBoothPayload(payload = {}) {
	const data = {};
	if (payload.name && payload.name.trim()) {
		data.name = payload.name.trim();
	}
	const resolvedUsername =
		payload.manager_username ?? payload.managerUsername ?? payload.username ?? payload.manager;
	if (resolvedUsername && resolvedUsername.trim()) {
		data.manager_username = resolvedUsername.trim();
	}
	const resolvedUserId = payload.user_id ?? payload.userId ?? payload.manager_id ?? payload.managerId;
	if (resolvedUserId !== undefined && resolvedUserId !== null && resolvedUserId !== '') {
		const numericId = Number(resolvedUserId);
		if (!Number.isNaN(numericId)) {
			data.user_id = numericId;
		}
	}
	return data;
}

export const createBooth = (payload) =>
	apiRequest('/booths', { method: 'POST', data: buildBoothPayload(payload) });

export const getBooth = (id) => apiRequest(`/booths/${id}`);

export const listBooths = () => apiRequest('/booths');

export const updateBooth = (id, payload) =>
	apiRequest(`/booths/${id}`, { method: 'PATCH', data: buildBoothPayload(payload) });

export const deleteBooth = (id) => apiRequest(`/booths/${id}`, { method: 'DELETE' });

export const listProducts = () => apiRequest('/products');

export const listProductsByBooth = (boothId) => apiRequest(`/products/booth/${boothId}`);

export const getProduct = (id) => apiRequest(`/products/${id}`);

export const createProduct = (payload) =>
	apiRequest('/products', { method: 'POST', data: payload });

export const updateProduct = (id, payload) =>
	apiRequest(`/products/${id}`, { method: 'PATCH', data: payload });

export const deleteProduct = (id) => apiRequest(`/products/${id}`, { method: 'DELETE' });

export const createChargeRequest = (amount) =>
	apiRequest('/charge-requests', { method: 'POST', data: { amount } });

export const listChargeRequests = () => apiRequest('/charge-requests');

export const getChargeRequest = (id) => apiRequest(`/charge-requests/${id}`);

export const updateChargeRequest = (id, status) =>
	apiRequest(`/charge-requests/${id}`, { method: 'PATCH', data: { status } });

export const listTransactions = () => apiRequest('/transactions');

export const getTransaction = (id) => apiRequest(`/transactions/${id}`);

export const createTransaction = (payload) =>
	apiRequest('/transactions', { method: 'POST', data: payload });
