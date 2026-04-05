import { localeToBCP47, type Locale } from '@/dictionaries';

export type ContributionDay = { date: string; count: number };

export type ActivityMonthPoint = {
	/** `YYYY-MM`，当年公历月（UTC，与贡献日历日期一致） */
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

function calendarMonthLabel(month1To12: number, locale: Locale): string {
	const m = Math.floor(month1To12);
	if (m < 1 || m > 12) return String(month1To12);
	if (locale === 'zh') return ZH_MONTH_NAMES[m - 1]!;
	const d = new Date(Date.UTC(2000, m - 1, 1));
	return d.toLocaleDateString(localeToBCP47(locale), {
		month: 'short',
		timeZone: 'UTC',
	});
}

/**
 * 用 GraphQL 贡献日历的「按日」数据汇总为当年 12 个月（UTC）。
 */
export function summarizeContributionCalendarToActivityMonthPoints(
	calendarDays: ContributionDay[],
	options: { locale: Locale; refDate?: Date },
): ActivityMonthPoint[] {
	const ref = options.refDate ?? new Date();
	const year = ref.getUTCFullYear();
	const currentMonth = ref.getUTCMonth() + 1;

	const sums = new Array<number>(12).fill(0);

	for (const day of calendarDays) {
		const dateStr = day.date?.trim();
		if (!dateStr) continue;
		const t = Date.parse(`${dateStr}T12:00:00Z`);
		if (Number.isNaN(t)) continue;
		const d = new Date(t);
		if (d.getUTCFullYear() !== year) continue;
		const monthNum = d.getUTCMonth() + 1;
		if (monthNum > currentMonth) continue;
		sums[monthNum - 1]! += day.count;
	}

	return Array.from({ length: 12 }, (_, i) => {
		const monthNum = i + 1;
		const isFuture = monthNum > currentMonth;
		return {
			key: `${year}-${String(monthNum).padStart(2, '0')}`,
			label: calendarMonthLabel(monthNum, options.locale),
			count: isFuture ? 0 : sums[i]!,
			isFutureMonth: isFuture,
		};
	});
}
