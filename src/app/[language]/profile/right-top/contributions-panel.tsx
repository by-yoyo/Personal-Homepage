'use client';

import { useMemo, useState } from 'react';
import type { GithubContributionsSummary } from '@/lib/githubcontributions';
import styles from './page.module.css';

type ContributionsLabels = {
	title: string;
	calendarTitlePrefix: string;
	byYearLabel: string;
	totalLabel: string;
	currentStreakLabel: string;
	longestStreakLabel: string;
	emptyCalendar: string;
	emptyYears: string;
};

type Props = {
	summary: GithubContributionsSummary | null;
	contributions: ContributionsLabels;
};

function hasCjk(text: string): boolean {
	return /[\u4e00-\u9fa5]/.test(text);
}

function withColon(label: string): string {
	const colon = hasCjk(label) ? '：' : ':';
	return `${label}${colon}`;
}

function quantile(sorted: number[], q: number): number {
	if (sorted.length === 0) return 0;
	const pos = (sorted.length - 1) * q;
	const base = Math.floor(pos);
	const rest = pos - base;
	if (sorted[base + 1] === undefined) return sorted[base]!;
	return sorted[base]! + rest * (sorted[base + 1]! - sorted[base]!);
}

function buildWeeks(calendarDays: { date: string; count: number }[]) {
	const weekCount = Math.floor(calendarDays.length / 7);
	return Array.from({ length: weekCount }, (_, w) =>
		calendarDays.slice(w * 7, w * 7 + 7),
	);
}

function renderCalendarSvg({
	calendarDays,
}: {
	calendarDays: { date: string; count: number }[];
}) {
	const counts = calendarDays.map((d) => d.count);
	const nonZeroCounts = counts.filter((c) => c > 0).sort((a, b) => a - b);

	const q1 = quantile(nonZeroCounts, 0.25);
	const q2 = quantile(nonZeroCounts, 0.5);
	const q3 = quantile(nonZeroCounts, 0.75);

	function levelFor(count: number): number {
		if (count <= 0) return 0;
		if (count <= q1) return 1;
		if (count <= q2) return 2;
		if (count <= q3) return 3;
		return 4;
	}

	const weeks = buildWeeks(calendarDays);
	const cols = weeks.length;
	const rows = 7;

	// 热力图格子尺寸：尽量贴近卡片宽度
	const GAP = 1;
	// 贡献日历格子宽度：用固定值即可（不依赖 locale，避免运行时 ReferenceError）
	const targetSvgWidth = 460;
	const CELL = Math.max(
		5,
		Math.round((targetSvgWidth - (cols - 1) * GAP) / Math.max(1, cols)),
	);
	const xStep = CELL + GAP;
	const yStep = CELL + GAP;
	const svgWidth = Math.max(1, cols * xStep - GAP);
	const gridH = Math.max(1, rows * yStep - GAP);
	// 给月份文字预留上下空间：上方一排、下方一排
	const topLabelH = 20;
	const bottomLabelH = 22;
	const svgHeight = gridH + topLabelH + bottomLabelH;

	const monthLabelFmt = new Intl.DateTimeFormat(undefined, {
		month: 'short',
		timeZone: 'UTC',
	});

	const seenMonths = new Set<string>();
	// 按时间顺序收集（GraphQL 返回的 days 与月份进度一致）
	const monthLabels: { x: number; label: string }[] = [];

	for (let w = 0; w < weeks.length; w++) {
		const week = weeks[w]!;
		for (let dayIdx = 0; dayIdx < week.length; dayIdx++) {
			const d = week[dayIdx]!;
			const dt = new Date(`${d.date}T00:00:00Z`);
			if (Number.isNaN(dt.getTime())) continue;
			const utcDay = dt.getUTCDate();
			if (utcDay !== 1) continue;

			const key = `${dt.getUTCFullYear()}-${dt.getUTCMonth()}`;
			if (seenMonths.has(key)) continue;
			seenMonths.add(key);

			monthLabels.push({
				x: w * xStep + CELL / 2,
				label: monthLabelFmt.format(dt),
			});
		}
	}

	const rects = weeks.map((week, w) =>
		week.map((d, dayIdx) => {
			const lvl = levelFor(d.count);
			const fillVar =
				lvl === 0
					? 'var(--contrib-0)'
					: lvl === 1
						? 'var(--contrib-1)'
						: lvl === 2
							? 'var(--contrib-2)'
							: lvl === 3
								? 'var(--contrib-3)'
								: 'var(--contrib-4)';

			return (
				<rect
					key={`${d.date}-${w}-${dayIdx}`}
					x={w * xStep}
					y={topLabelH + dayIdx * yStep}
					width={CELL}
					height={CELL}
					rx={1.5}
					fill={fillVar}
					stroke='var(--theme-surface-border)'
					strokeOpacity={0.35}
					strokeWidth={0.35}
				/>
			);
		}),
	);

	return (
		<svg
			className={styles.contribCalendarSvg}
			viewBox={`0 0 ${svgWidth} ${svgHeight}`}
			role='img'
			preserveAspectRatio='xMidYMid meet'
			suppressHydrationWarning
			aria-label='GitHub contributions calendar'>
			{rects}
			{(() => {
				const topY = topLabelH - 6;
				const bottomY = topLabelH + gridH + 16;
				return monthLabels.map((m, idx) => (
					<text
						key={`${m.label}-${idx}`}
						x={m.x}
						// 交错放置：上/下/上/下...
						y={idx % 2 === 0 ? topY : bottomY}
						textAnchor='middle'
						fontSize='8'
						fill='var(--theme-text-muted)'>
						{m.label}
					</text>
				));
			})()}
		</svg>
	);
}

function renderYearBarsSvg({
	years,
	selectedYear,
	onPickYear,
	byYearLabel,
}: {
	years: { year: number; count: number }[];
	selectedYear: number;
	onPickYear: (y: number) => void;
	byYearLabel: string;
}) {
	const yearsAsc = [...years].sort((a, b) => a.year - b.year);
	const maxCount = Math.max(1, ...yearsAsc.map((y) => y.count));

	const n = yearsAsc.length;
	const W = 360;
	const H = 104;
	const PAD_L = 10;
	const PAD_R = 10;
	const PAD_T = 10;
	const PAD_B = 32;
	const barAreaH = H - PAD_T - PAD_B;
	const GAP = 8;
	const barW = Math.max(8, Math.floor((W - PAD_L - PAD_R - GAP * (n - 1)) / n));

	return (
		<svg className={styles.yearsBarsSvg} viewBox={`0 0 ${W} ${H}`} role='img' aria-label={byYearLabel}>
			{yearsAsc.map((it, i) => {
				const h = Math.round((it.count / maxCount) * barAreaH);
				const x = PAD_L + i * (barW + GAP);
				const y = PAD_T + (barAreaH - h);
				const countTextY = Math.max(6, y - 4);
				const yearTextY = H - 10;
				const picked = it.year === selectedYear;

				return (
					<g key={it.year}>
						<rect
							x={x}
							y={y}
							width={barW}
							height={Math.max(1, h)}
							rx={3}
							fill='var(--theme-accent, #58a6ff)'
							opacity={it.count === 0 ? 0.2 : picked ? 1 : 0.95}
							stroke={picked ? 'var(--theme-text)' : 'transparent'}
							strokeWidth={picked ? 1 : 0}
							style={{ cursor: 'pointer' }}
							onClick={() => onPickYear(it.year)}
						/>
						<text
							x={x + barW / 2}
							y={yearTextY}
							textAnchor='middle'
							fontSize='10'
							fill='var(--theme-text-muted)'>
							{it.year}
						</text>
						{it.count > 0 ? (
							<text
								x={x + barW / 2}
								y={countTextY}
								textAnchor='middle'
								fontSize='10'
								fontWeight={650}
								fill='var(--theme-text)'>
								{it.count}
							</text>
						) : null}
					</g>
				);
			})}
		</svg>
	);
}

export default function ContributionsPanel({
	summary,
	contributions,
}: Props) {
	const yearsDesc = useMemo(
		() => summary?.years?.slice(0, 5) ?? [],
		[summary],
	);
	const latestYear = yearsDesc[0]?.year ?? new Date().getUTCFullYear();

	const [selectedYear, setSelectedYear] = useState<number>(latestYear);

	// 当 summary/locale 更新时，selectedYear 也跟着最新年份回到默认
	const safeSummary = summary;
	const effectiveSelectedYear = useMemo(() => {
		if (!safeSummary || yearsDesc.length === 0) return latestYear;
		return yearsDesc.some((y) => y.year === selectedYear) ? selectedYear : latestYear;
	}, [safeSummary, yearsDesc, latestYear, selectedYear]);

	const selectedCalendar = useMemo(() => {
		if (!safeSummary) return [];
		if (!safeSummary.yearCalendars?.length) return safeSummary.calendarDays;
		return safeSummary.yearCalendars.find((c) => c.year === effectiveSelectedYear)
			?.calendarDays ?? [];
	}, [safeSummary, effectiveSelectedYear]);

	const byYearLabel = contributions.byYearLabel;
	const calendarTitle = `${contributions.calendarTitlePrefix}${effectiveSelectedYear}`;

	return (
		<div className={styles.contribWrap} aria-label='GitHub contributions'>
			<h3 className={styles.contribTitle}>{contributions.title}</h3>

			<div className={styles.calendarHeader} aria-label={calendarTitle}>
				{calendarTitle}
			</div>

			<div className={styles.streakRow} aria-label='Streak stats'>
				<div className={styles.calendarTopStat}>
					<div className={styles.statLabel}>{withColon(contributions.longestStreakLabel)}</div>
					<div className={styles.statValue}>
						{safeSummary ? safeSummary.longestStreak : '—'}
					</div>
				</div>

				<div className={styles.calendarTopStat}>
					<div className={styles.statLabel}>{withColon(contributions.currentStreakLabel)}</div>
					<div className={styles.statValue}>
						{safeSummary ? safeSummary.currentStreak : '—'}
					</div>
				</div>
			</div>

			{selectedCalendar.length > 0 ? (
				<div className={styles.calendarWrap}>
					{renderCalendarSvg({ calendarDays: selectedCalendar })}
				</div>
			) : (
				<p className={styles.contribEmpty}>
					{contributions.emptyCalendar}
				</p>
			)}

			<div className={styles.yearsBlock}>
				<div className={styles.yearsHeaderRow}>
					<div className={styles.yearsTitle}>{byYearLabel}</div>
					<div className={styles.yearsCurrent}>
						<div className={styles.statLabel}>
							{withColon(contributions.totalLabel)}
						</div>
						<div className={styles.statValue}>
							{safeSummary ? safeSummary.totalContributionsAllTime : '—'}
						</div>
					</div>
				</div>

				{yearsDesc.length > 0 ? (
					renderYearBarsSvg({
						years: yearsDesc,
						selectedYear: effectiveSelectedYear,
						onPickYear: (y) => setSelectedYear(y),
						byYearLabel,
					})
				) : (
					<p className={styles.contribEmpty}>
						{contributions.emptyYears}
					</p>
				)}
			</div>
		</div>
	);
}

