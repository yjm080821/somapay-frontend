const currencyFormatter = new Intl.NumberFormat('ko-KR', {
	style: 'currency',
	currency: 'KRW',
	maximumFractionDigits: 0
});

export function formatCurrency(value) {
	if (value === null || value === undefined || Number.isNaN(Number(value))) {
		return '₩0';
	}
	return currencyFormatter.format(Number(value));
}

export function formatDateTime(value) {
	if (!value) {
		return '-';
	}

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return value;
	}

	const datePart = date.toLocaleDateString('ko-KR', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	});
	const timePart = date.toLocaleTimeString('ko-KR', {
		hour: '2-digit',
		minute: '2-digit'
	});
	return `${datePart} ${timePart}`;
}

export function normalizePage(payload) {
	if (!payload) {
		return {
			content: [],
			totalElements: 0,
			totalPages: 0,
			number: 0,
			size: 0
		};
	}

	if (Array.isArray(payload)) {
		return {
			content: payload,
			totalElements: payload.length,
			totalPages: 1,
			number: 0,
			size: payload.length
		};
	}

	return {
		content: Array.isArray(payload.content) ? payload.content : [],
		totalElements: payload.totalElements ?? payload.content?.length ?? 0,
		totalPages: payload.totalPages ?? 1,
		number: payload.number ?? 0,
		size: payload.size ?? payload.content?.length ?? 0
	};
}

export function toArray(value) {
	if (!value) {
		return [];
	}

	if (Array.isArray(value)) {
		return value;
	}

	if (Array.isArray(value.content)) {
		return value.content;
	}

	if (Array.isArray(value.items)) {
		return value.items;
	}

	return [];
}
