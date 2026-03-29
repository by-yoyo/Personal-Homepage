import type { ActivityMonthPoint } from '@/lib/githubevents';
import styles from './page.module.css';

type ActivityChartProps = {
	points: ActivityMonthPoint[];
	chartTitle: string;
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

export function ActivityLineChart({ points, chartTitle }: ActivityChartProps) {
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

	const lineD = xs
		.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${ys[i].toFixed(2)}`)
		.join(' ');

	const areaD =
		n === 0
			? ''
			: `M ${xs[0].toFixed(2)} ${(PAD_T + plotH).toFixed(2)} ${xs
					.map((x, i) => `L ${x.toFixed(2)} ${ys[i].toFixed(2)}`)
					.join(' ')} L ${xs[n - 1].toFixed(2)} ${(PAD_T + plotH).toFixed(2)} Z`;

	return (
		<div className={styles.chartWrap}>
			<svg
				className={styles.chartSvg}
				viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
				overflow='visible'
				role='img'
				aria-label={chartTitle}
			>
				<title>{chartTitle}</title>
				<defs>
					<linearGradient id='activityAreaGrad' x1='0' y1='0' x2='0' y2='1'>
						<stop offset='0%' stopColor='currentColor' stopOpacity={0.28} />
						<stop offset='100%' stopColor='currentColor' stopOpacity={0.02} />
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
				<path className={styles.chartLine} d={lineD} fill='none' />
				{points.map((p, i) => (
					<g key={p.key}>
						<circle className={styles.chartDot} cx={xs[i]} cy={ys[i]} r={3} />
						{/* 旋转中心与数据点同 x，水平居中，避免 textAnchor=end 导致长短月名相对节点左右偏移 */}
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
				))}
			</svg>
		</div>
	);
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
