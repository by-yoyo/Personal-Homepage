import type { GithubPublicEventSummary } from '@/lib/github';

/** 活动列表仅展示排名前 N 条（先按次数降序，次数相同再按最近时间降序） */
export const EVENT_LIST_TOP_N = 10;

export type GithubEventNameTypeRow = {
	rawName: string;
	type: string;
	count: number;
	/** 该组内事件里最新的 `created_at`（ISO），用于同次数时排序 */
	lastCreatedAt: string;
};

function eventUtcMonthKey(iso: string): string | null {
	const t = Date.parse(iso);
	if (Number.isNaN(t)) return null;
	const d = new Date(t);
	return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** 仅保留 `created_at` 落在指定 `YYYY-MM`（UTC）内的事件 */
export function filterEventsByMonthKey(
	events: GithubPublicEventSummary[],
	monthKey: string,
): GithubPublicEventSummary[] {
	if (!monthKey) return [];
	return events.filter((e) => eventUtcMonthKey(e.created_at) === monthKey);
}

/** 仅保留「当前 UTC 月」内的事件（与图表月份口径一致） */
export function filterEventsCurrentUtcMonth(
	events: GithubPublicEventSummary[],
	refDate: Date = new Date(),
): GithubPublicEventSummary[] {
	const y = refDate.getUTCFullYear();
	const m = refDate.getUTCMonth() + 1;
	const want = `${y}-${String(m).padStart(2, '0')}`;
	return events.filter((e) => eventUtcMonthKey(e.created_at) === want);
}

/**
 * 列表中的仓库名：`owner/repo` 只取 `/` 后一段；无 `/` 时原样使用 API 的 `name`。
 */
export function formatEventListRepo(name: string): string {
	const i = name.indexOf('/');
	if (i === -1) return name;
	const repo = name.slice(i + 1).trim();
	return repo.length > 0 ? repo : name;
}

/** 单行展示：`repo:type-次数` */
export function formatEventListLine(row: GithubEventNameTypeRow): string {
	return `${formatEventListRepo(row.rawName)}:${row.type}-${row.count}`;
}

/** 相同 name 下按 type 分别计数，并记录该组内最近一次 `created_at` */
export function aggregateEventsByNameAndType(
	events: GithubPublicEventSummary[],
): GithubEventNameTypeRow[] {
	type Agg = { count: number; lastAtMs: number; lastCreatedAt: string };
	const map = new Map<string, Agg>();
	for (const e of events) {
		const key = `${e.name}\0${e.type}`;
		const t = Date.parse(e.created_at);
		const prev = map.get(key);
		if (!prev) {
			map.set(key, {
				count: 1,
				lastAtMs: Number.isNaN(t) ? 0 : t,
				lastCreatedAt: e.created_at,
			});
		} else {
			prev.count += 1;
			if (!Number.isNaN(t) && t >= prev.lastAtMs) {
				prev.lastAtMs = t;
				prev.lastCreatedAt = e.created_at;
			}
		}
	}
	const rows: GithubEventNameTypeRow[] = [];
	for (const [key, agg] of map) {
		const sep = key.indexOf('\0');
		const rawName = key.slice(0, sep);
		const type = key.slice(sep + 1);
		rows.push({
			rawName,
			type,
			count: agg.count,
			lastCreatedAt: agg.lastCreatedAt,
		});
	}
	rows.sort((a, b) => {
		if (b.count !== a.count) return b.count - a.count;
		return Date.parse(b.lastCreatedAt) - Date.parse(a.lastCreatedAt);
	});
	return rows.slice(0, EVENT_LIST_TOP_N);
}
