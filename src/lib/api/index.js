import {
	apiRequest,
	getStoredToken,
	setStoredToken,
	clearStoredToken,
	API_BASE_URL
} from './client';

export { API_BASE_URL, getStoredToken, setStoredToken, clearStoredToken };

export const login = (credentials) =>
	apiRequest('/auth/login', { method: 'POST', data: credentials, auth: false });

export const logout = () => apiRequest('/auth/logout', { method: 'POST' });

export const getRole = () => apiRequest('/auth/role');

export const getUsers = () => apiRequest('/user');

export const createUser = (payload) => apiRequest('/user', { method: 'POST', data: payload });

export const getUserById = (id) => apiRequest(`/user/${id}`);

export const getBooths = () => apiRequest('/booth');

export const getBoothById = (id) => apiRequest(`/booth/${id}`);

export const getProducts = () => apiRequest('/product');

export const getProductById = (id) => apiRequest(`/product/${id}`);

export const createProduct = (payload) => apiRequest('/product', { method: 'POST', data: payload });

export const updateProduct = (id, payload) =>
	apiRequest(`/product/${id}`, { method: 'PUT', data: payload });

export const deleteProduct = (id) => apiRequest(`/product/${id}`, { method: 'DELETE' });

export const createTransaction = (userId, payload) =>
	apiRequest(`/transaction/${userId}`, { method: 'POST', data: payload });

export const getTransactionById = (id) => apiRequest(`/transaction/${id}`);

export const getTransactionsByUser = (userId, page = 0) =>
	apiRequest(`/transaction/user/${userId}`, { params: { page } });

export const getTransactionsByBooth = (boothId, page = 0) =>
	apiRequest(`/transaction/booth/${boothId}`, { params: { page } });

export const getBoothTotalSales = (boothId) => apiRequest(`/transaction/booth/${boothId}/total`);

export const requestCharge = (userId, amount) =>
	apiRequest(`/charge/${userId}`, { method: 'POST', data: { amount } });

export const getUserCharges = (userId, page = 0) =>
	apiRequest(`/charge/user/${userId}`, { params: { page } });

export const getChargeRequests = (page = 0) =>
	apiRequest('/charge/admin/requests', { params: { page } });

export const approveCharge = (id) => apiRequest(`/charge/approve/${id}`, { method: 'POST' });

export const rejectCharge = (id) => apiRequest(`/charge/reject/${id}`, { method: 'POST' });
