/**
 * 仓库卡片分页：纯函数。
 * 页码条为连续数字窗口；总页数较多时窗口以当前页为几何中心（首尾附近则贴边）；
 * 总页数不超过可见槽位时一次性展示全部页码。
 */

export type PaginationSlot = { kind: 'page'; idx: number };

/** 中间可见页码个数（奇数 5–13），不含左右箭头 */
export function clampOddMiddleSlots(widthPx: number): number {
	const approx = Math.round((widthPx - 72) / 32);
	let n = Math.max(5, Math.min(13, approx));
	if (n % 2 === 0) n -= 1;
	return Math.max(5, n);
}

export function clampPageIndex(pageIndex: number, totalPages: number): number {
	const max = Math.max(0, totalPages - 1);
	return Math.min(Math.max(0, pageIndex), max);
}

export function stepPageIndex(
	pageIndex: number,
	delta: -1 | 1,
	totalPages: number,
): number {
	return clampPageIndex(
		clampPageIndex(pageIndex, totalPages) + delta,
		totalPages,
	);
}

/**
 * 滑动窗口起点（0-based 页下标）：使 `page` 尽量落在窗口正中；
 * 靠近开头或结尾时窗口贴边，保证窗口长度恒为 `windowSize`。
 */
export function centeredWindowStart(
	page: number,
	totalPages: number,
	windowSize: number,
): number {
	if (totalPages <= windowSize) return 0;
	const half = (windowSize - 1) >> 1;
	let start = page - half;
	if (start < 0) start = 0;
	const maxStart = totalPages - windowSize;
	if (start > maxStart) start = maxStart;
	return start;
}

/**
 * 生成中间区域页码槽位（仅 `page` 类型，无省略号）。
 * @param currentPage 当前页 0-based
 */
export function buildCenteredPageStrip(
	totalPages: number,
	visibleSlots: number,
	currentPage: number,
): PaginationSlot[] {
	if (totalPages <= 1) return [];

	const page = clampPageIndex(currentPage, totalPages);

	if (totalPages <= visibleSlots) {
		return Array.from({ length: totalPages }, (_, i) => ({
			kind: 'page' as const,
			idx: i,
		}));
	}

	const start = centeredWindowStart(page, totalPages, visibleSlots);
	return Array.from({ length: visibleSlots }, (_, i) => ({
		kind: 'page' as const,
		idx: start + i,
	}));
}
