import type { GithubPublicEventSummary } from '@/lib/github';
import type { Locale } from '@/dictionaries';

export type ActivityMonthPoint = {
	/** `YYYY-MM`，当年公历月（UTC，与 `created_at` 对齐） */
	key: string;
	/** 一月…十二月 / Jan…Dec */
	label: string;
	count: number;
	/** 当年尚未到来的月份（UTC） */
	isFutureMonth: boolean;
};

const ZH_MONTH_NAMES = [
	'一月',
	'二月',
	'三月',
	'四月',
	'五月',
	'六月',
	'七月',
	'八月',
	'九月',
	'十月',
	'十一月',
	'十二月',
] as const;

function monthKeyUtc(d: Date): string {
	return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function parseEventMonthKey(iso: string): string | null {
	const t = Date.parse(iso);
	if (Number.isNaN(t)) return null;
	return monthKeyUtc(new Date(t));
}

function calendarMonthLabel(month1To12: number, locale: Locale): string {
	const m = Math.floor(month1To12);
	if (m < 1 || m > 12) return String(month1To12);
	if (locale === 'zh') return ZH_MONTH_NAMES[m - 1]!;
	const d = new Date(Date.UTC(2000, m - 1, 1));
	return d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
}

/**
 * 当年公历 1–12 月；未到来的月份计数为 0。
 * 分桶与「当前日期」均按 UTC，与 GitHub `created_at`（Z）一致。
 */
export function summarizeGithubEventsCurrentYear(
	events: GithubPublicEventSummary[],
	options: { locale: Locale; refDate?: Date },
): ActivityMonthPoint[] {
	const ref = options.refDate ?? new Date();
	const year = ref.getUTCFullYear();
	const currentMonth = ref.getUTCMonth() + 1;

	const keys: string[] = [];
	for (let m = 1; m <= 12; m++) {
		keys.push(`${year}-${String(m).padStart(2, '0')}`);
	}

	const counts = new Map<string, number>(keys.map((k) => [k, 0]));

	for (const e of events) {
		const k = parseEventMonthKey(e.created_at);
		if (!k || !counts.has(k)) continue;
		const monthNum = Number(k.split('-')[1]);
		if (!Number.isFinite(monthNum)) continue;
		/** 当年尚未到来的月份不计入（理论上不会有未来事件，仅显式约束） */
		if (monthNum > currentMonth) continue;
		counts.set(k, (counts.get(k) ?? 0) + 1);
	}

	return keys.map((key, i) => {
		const monthNum = i + 1;
		const isFuture = monthNum > currentMonth;
		const c = isFuture ? 0 : (counts.get(key) ?? 0);
		return {
			key,
			label: calendarMonthLabel(monthNum, options.locale),
			count: c,
			isFutureMonth: isFuture,
		};
	});
}
