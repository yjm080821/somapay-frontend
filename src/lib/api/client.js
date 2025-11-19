const API_BASE_URL = 'https://pay.gbsw.hs.kr:8443';
const TOKEN_STORAGE_KEY = 'somapay:token';

let inMemoryToken = null;

function readTokenFromStorage() {
	if (typeof localStorage === 'undefined') {
		return null;
	}
	return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function getStoredToken() {
	if (inMemoryToken) {
		return inMemoryToken;
	}

	const stored = readTokenFromStorage();
	inMemoryToken = stored;
	return stored;
}

export function setStoredToken(token) {
	inMemoryToken = token || null;

	if (typeof localStorage === 'undefined') {
		return;
	}

	if (token) {
		localStorage.setItem(TOKEN_STORAGE_KEY, token);
	} else {
		localStorage.removeItem(TOKEN_STORAGE_KEY);
	}
}

export function clearStoredToken() {
	setStoredToken(null);
}

function buildUrl(path, params) {
	const url = new URL(path, API_BASE_URL);

	if (params) {
		Object.entries(params)
			.filter(([, value]) => value !== undefined && value !== null && value !== '')
			.forEach(([key, value]) => url.searchParams.append(key, value));
	}

	return url;
}

async function parseResponseBody(response) {
	const text = await response.text();
	if (!text) {
		return null;
	}

	try {
		return JSON.parse(text);
	} catch {
		return text;
	}
}

export async function apiRequest(path, options = {}) {
	const {
		method = 'GET',
		data,
		params,
		headers = {},
		auth = true,
		token: forcedToken,
		signal
	} = options;

	const url = buildUrl(path, params);
	const requestHeaders = { ...headers };

	if (auth) {
		const resolvedToken = forcedToken || getStoredToken();
		if (!resolvedToken) {
			throw new Error('인증 토큰이 없습니다. 다시 로그인해주세요.');
		}
		requestHeaders.Authorization = resolvedToken;
	}

	let body;
	if (data !== undefined) {
		requestHeaders['Content-Type'] = 'application/json';
		body = JSON.stringify(data);
	}

	let response;
	try {
		response = await fetch(url, {
			method,
			headers: requestHeaders,
			body,
			signal
		});
	} catch {
		throw new Error('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
	}

	if (response.status === 204) {
		return null;
	}

	const parsed = await parseResponseBody(response);
	if (!response.ok) {
		if (response.status === 401 && auth) {
			clearStoredToken();
		}
		const message =
			(parsed && (parsed.message || parsed.error || parsed.details)) ||
			(typeof parsed === 'string' && parsed) ||
			'요청 처리 중 문제가 발생했습니다.';

		const requestError = new Error(message);
		requestError.status = response.status;
		if (response.status === 401) {
			requestError.code = 'TOKEN_EXPIRED';
		}
		requestError.payload = parsed;
		throw requestError;
	}

	return parsed;
}

export { API_BASE_URL };
