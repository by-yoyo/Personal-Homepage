'use client';

import { useState } from 'react';
import type { ActivityMonthPoint } from '@/lib/githubevents';
import styles from './page.module.css';

type ActivityChartProps = {
	points: ActivityMonthPoint[];
	chartTitle: string;
	/** 选中月份下标 0–11，与下方列表联动 */
	selectedMonthIndex: number;
	onMonthSelect: (monthIndex: number) => void;
};

const VIEW_W = 480;
const VIEW_H = 208;
const PAD_L = 28;
/** 右侧留白：最右点「十二月」倾斜后易超出 viewBox，需避免被 SVG 裁切 */
const PAD_R = 40;
const PAD_T = 14;
/** 底部留足斜排月份标签空间 */
const PAD_B = 56;
/** 顺时针倾斜：沿文字方向左高右低（略小于 45°，更平一些） */
const X_LABEL_ROTATE = 32;
/** 月份锚点 y（越小越靠上） */
const X_LABEL_ANCHOR_Y = VIEW_H - 22;

export function ActivityLineChart({
	points,
	chartTitle,
	selectedMonthIndex,
	onMonthSelect,
}: ActivityChartProps) {
	const [hovered, setHovered] = useState<number | null>(null);
	const n = points.length;
	const counts = points.map((p) => p.count);
	const maxRaw = Math.max(0, ...counts);
	const yTicks = pickYTicks(maxRaw);
	const scaleMax = Math.max(yTicks[yTicks.length - 1] ?? 1, 1);
	const plotW = VIEW_W - PAD_L - PAD_R;
	const plotH = VIEW_H - PAD_T - PAD_B;

	const xs =
		n <= 1 ? [PAD_L + plotW / 2] : points.map((_, i) => PAD_L + (i / (n - 1)) * plotW);
	const ys = counts.map((c) => PAD_T + plotH - (c / scaleMax) * plotH);

	const segmentVariants = n <= 1 ? [] : points.slice(1).map((_, i) => segmentVariant(points, i + 1));
	const nodeVariants = points.map((_, i) => nodeVariant(points, i));

	const bottomY = PAD_T + plotH;
	const areaD =
		n === 0 ? '' : smoothAreaPathD(xs, ys, bottomY, n);

	/** 第一个未过月份下标；其左侧折线段（上一月到本月）为已过→未过分界，用黄虚线 */
	const firstFutureIdx = points.findIndex((p) => p.isFutureMonth);

	return (
		<div className={styles.chartWrap}>
			<svg
				className={styles.chartSvg}
				viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
				overflow='visible'
				role='img'
				aria-label={chartTitle}
			>
				<defs>
					<linearGradient id='activityAreaGrad' x1='0' y1='0' x2='0' y2='1'>
						<stop offset='0%' stopColor='var(--theme-text-subtle)' stopOpacity={0.2} />
						<stop offset='100%' stopColor='var(--theme-text-subtle)' stopOpacity={0.03} />
					</linearGradient>
				</defs>
				{yTicks.map((t) => {
					const yy = PAD_T + plotH - (t / scaleMax) * plotH;
					return (
						<g key={t}>
							<line
								className={styles.chartGrid}
								x1={PAD_L}
								y1={yy}
								x2={PAD_L + plotW}
								y2={yy}
							/>
							<text className={styles.chartTick} x={PAD_L - 6} y={yy + 4} textAnchor='end'>
								{t}
							</text>
						</g>
					);
				})}
				<path className={styles.chartArea} d={areaD} fill='url(#activityAreaGrad)' />
				{segmentVariants.map((variant, j) => {
					const i = j + 1;
					const isPastToFutureSeg =
						firstFutureIdx > 0 && i === firstFutureIdx && variant === 'yellow';
					const segClass = isPastToFutureSeg
						? styles.chartSegYellowDashed
						: segClassForVariant(variant);
					const d = smoothSegmentPathD(xs, ys, j, n);
					return <path key={`seg-${points[i]!.key}`} className={segClass} d={d} fill='none' />;
				})}
				{points.map((p, i) => {
					const countStr = String(p.count);
					const tipW = Math.max(40, 16 + countStr.length * 9);
					const showTip = hovered === i;
					return (
						<g
							key={p.key}
							aria-label={`${p.label}: ${p.count}`}
							onMouseEnter={() => setHovered(i)}
							onMouseLeave={() => setHovered(null)}
							onClick={() => onMonthSelect(i)}
						>
							{/*
							 * 热区仅限绘图区（plotH），不包含底部月份文字，避免点到月份也切换选中。
							 */}
							<rect
								className={styles.chartHit}
								x={xs[i] - 15}
								y={PAD_T}
								width={30}
								height={plotH}
							/>
							{showTip && (
								<g
									className={styles.chartTooltip}
									transform={`translate(${xs[i]}, ${ys[i]})`}
									aria-hidden
								>
									<rect
										className={styles.chartTooltipRect}
										x={-(tipW / 2)}
										y={-34}
										width={tipW}
										height={22}
										rx={6}
										ry={6}
									/>
									<text
										className={styles.chartTooltipText}
										x={0}
										y={-18}
										textAnchor='middle'
										dominantBaseline='middle'
									>
										{countStr}
									</text>
								</g>
							)}
							<circle
								className={`${dotClassForVariant(nodeVariants[i]!)} ${selectedMonthIndex === i ? styles.chartDotSelected : ''}`}
								cx={xs[i]}
								cy={ys[i]}
								r={3}
							/>
							<text
								className={styles.chartXLabel}
								x={xs[i]}
								y={X_LABEL_ANCHOR_Y}
								transform={`rotate(${X_LABEL_ROTATE} ${xs[i]} ${X_LABEL_ANCHOR_Y})`}
								textAnchor='middle'
								dominantBaseline='middle'
							>
								{p.label}
							</text>
						</g>
					);
				})}
			</svg>
		</div>
	);
}

type TrendVariant = 'green' | 'red' | 'yellow' | 'neutral';

function segmentVariant(
	points: ReadonlyArray<{ count: number; isFutureMonth: boolean }>,
	i: number,
): TrendVariant {
	const curr = points[i]!;
	if (curr.isFutureMonth) return 'yellow';
	const prev = points[i - 1]!;
	if (prev.isFutureMonth) return 'yellow';
	if (curr.count > prev.count) return 'green';
	if (curr.count < prev.count) return 'red';
	return 'neutral';
}

function nodeVariant(
	points: ReadonlyArray<{ count: number; isFutureMonth: boolean }>,
	i: number,
): TrendVariant {
	const curr = points[i]!;
	if (curr.isFutureMonth) return 'yellow';
	if (i === 0) return curr.count > 0 ? 'green' : 'neutral';
	const prev = points[i - 1]!;
	if (prev.isFutureMonth) return 'yellow';
	if (curr.count > prev.count) return 'green';
	if (curr.count < prev.count) return 'red';
	return 'neutral';
}

function segClassForVariant(v: TrendVariant): string {
	switch (v) {
		case 'green':
			return styles.chartSegGreen;
		case 'red':
			return styles.chartSegRed;
		case 'yellow':
			return styles.chartSegYellow;
		default:
			return styles.chartSegNeutral;
	}
}

function dotClassForVariant(v: TrendVariant): string {
	switch (v) {
		case 'green':
			return styles.chartDotGreen;
		case 'red':
			return styles.chartDotRed;
		case 'yellow':
			return styles.chartDotYellow;
		default:
			return styles.chartDotNeutral;
	}
}

/** Catmull-Rom → 三次贝塞尔控制点（段 i → i+1） */
function cubicCP(
	xs: number[],
	ys: number[],
	i: number,
	n: number,
): { cp1x: number; cp1y: number; cp2x: number; cp2y: number } {
	const p0x = xs[Math.max(0, i - 1)]!;
	const p0y = ys[Math.max(0, i - 1)]!;
	const p1x = xs[i]!;
	const p1y = ys[i]!;
	const p2x = xs[i + 1]!;
	const p2y = ys[i + 1]!;
	const p3x = xs[Math.min(n - 1, i + 2)]!;
	const p3y = ys[Math.min(n - 1, i + 2)]!;
	return {
		cp1x: p1x + (p2x - p0x) / 6,
		cp1y: p1y + (p2y - p0y) / 6,
		cp2x: p2x - (p3x - p1x) / 6,
		cp2y: p2y - (p3y - p1y) / 6,
	};
}

/** 第 j 段平滑曲线（j..j+1），j ∈ [0, n-2] */
function smoothSegmentPathD(xs: number[], ys: number[], j: number, n: number): string {
	const { cp1x, cp1y, cp2x, cp2y } = cubicCP(xs, ys, j, n);
	return `M ${xs[j]!.toFixed(2)} ${ys[j]!.toFixed(2)} C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)} ${cp2x.toFixed(2)} ${cp2y.toFixed(2)} ${xs[j + 1]!.toFixed(2)} ${ys[j + 1]!.toFixed(2)}`;
}

/** 面积：底边 → 沿平滑曲线上沿 → 回底边闭合 */
function smoothAreaPathD(xs: number[], ys: number[], bottomY: number, n: number): string {
	if (n === 0) return '';
	if (n === 1) {
		return `M ${xs[0]!.toFixed(2)} ${bottomY.toFixed(2)} L ${xs[0]!.toFixed(2)} ${ys[0]!.toFixed(2)} L ${xs[0]!.toFixed(2)} ${bottomY.toFixed(2)} Z`;
	}
	let d = `M ${xs[0]!.toFixed(2)} ${bottomY.toFixed(2)} L ${xs[0]!.toFixed(2)} ${ys[0]!.toFixed(2)}`;
	for (let i = 0; i < n - 1; i++) {
		const { cp1x, cp1y, cp2x, cp2y } = cubicCP(xs, ys, i, n);
		d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)} ${cp2x.toFixed(2)} ${cp2y.toFixed(2)} ${xs[i + 1]!.toFixed(2)} ${ys[i + 1]!.toFixed(2)}`;
	}
	d += ` L ${xs[n - 1]!.toFixed(2)} ${bottomY.toFixed(2)} Z`;
	return d;
}

function pickYTicks(maxRaw: number): number[] {
	if (maxRaw <= 0) return [0, 1];
	if (maxRaw <= 4) {
		const out: number[] = [];
		for (let v = 0; v <= maxRaw; v++) out.push(v);
		return out;
	}
	const step = niceStep(maxRaw / 3);
	const top = Math.ceil(maxRaw / step) * step;
	const ticks: number[] = [];
	for (let v = 0; v <= top; v += step) ticks.push(v);
	if (ticks[ticks.length - 1] !== top) ticks.push(top);
	return ticks.length > 8 ? ticks.slice(0, 8) : ticks;
}

function niceStep(raw: number): number {
	const pow = 10 ** Math.floor(Math.log10(raw));
	const n = raw / pow;
	let f = 1;
	if (n > 5) f = 10;
	else if (n > 2) f = 5;
	else if (n > 1) f = 2;
	return f * pow;
}
