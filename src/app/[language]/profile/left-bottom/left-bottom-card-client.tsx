'use client';

import { useMemo, useState } from 'react';
import type { GithubPublicEventSummary } from '@/lib/github';
import type { ActivityMonthPoint } from '@/lib/githubevents';
import {
	aggregateEventsByNameAndType,
	filterEventsByMonthKey,
	formatEventListRepo,
} from '@/lib/githubEventList';
import { ActivityLineChart } from './activity-chart';
import styles from './page.module.css';

type LeftBottomCardClientProps = {
	points: ActivityMonthPoint[];
	events: GithubPublicEventSummary[];
	chartTitle: string;
	monthEventListCaption: string;
	emptyNoActivity: string;
	emptyFuture: string;
};

export function LeftBottomCardClient({
	points,
	events,
	chartTitle,
	monthEventListCaption,
	emptyNoActivity,
	emptyFuture,
}: LeftBottomCardClientProps) {
	const [selectedMonthIndex, setSelectedMonthIndex] = useState(
		() => new Date().getUTCMonth(),
	);

	const selectedPoint = points[selectedMonthIndex];
	const monthKey = selectedPoint?.key ?? '';

	const filteredEvents = useMemo(
		() => filterEventsByMonthKey(events, monthKey),
		[events, monthKey],
	);

	const eventRows = useMemo(
		() => aggregateEventsByNameAndType(filteredEvents),
		[filteredEvents],
	);

	const isFuture = selectedPoint?.isFutureMonth ?? false;

	return (
		<div className={styles.box}>
			<h3 className={styles.chartHeading}>{chartTitle}</h3>
			<ActivityLineChart
				points={points}
				chartTitle={chartTitle}
				selectedMonthIndex={selectedMonthIndex}
				onMonthSelect={setSelectedMonthIndex}
			/>
			<h4 className={styles.monthEventHeading}>
				{selectedPoint ? `${selectedPoint.label} · ${monthEventListCaption}` : ''}
			</h4>
			{isFuture ? (
				<p className={styles.monthEventEmpty}>{emptyFuture}</p>
			) : eventRows.length === 0 ? (
				<p className={styles.monthEventEmpty}>{emptyNoActivity}</p>
			) : (
				<ul className={styles.eventList}>
					{eventRows.map((row) => (
						<li
							key={`${row.rawName}\0${row.type}`}
							className={styles.eventRow}
						>
							<span className={styles.eventLine}>
								{`${formatEventListRepo(row.rawName)}:${row.type}-${row.count}`}
							</span>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
