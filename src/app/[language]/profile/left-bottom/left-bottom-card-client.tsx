'use client';

import type { ActivityMonthPoint } from '@/lib/githubevents';
import { ActivityLineChart } from './activity-chart';
import styles from './page.module.css';

type LeftBottomCardClientProps = {
	points: ActivityMonthPoint[];
	chartTitle: string;
};

export function LeftBottomCardClient({
	points,
	chartTitle,
}: LeftBottomCardClientProps) {
	return (
		<div className={styles.box}>
			<h3 className={styles.chartHeading}>{chartTitle}</h3>
			<div className={styles.chartBlock}>
				<ActivityLineChart points={points} chartTitle={chartTitle} />
			</div>
		</div>
	);
}
