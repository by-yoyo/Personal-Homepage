'use client';

import { useMemo, useState } from 'react';
import type { GithubPublicEventSummary } from '@/lib/github';
import type { ActivityMonthPoint } from '@/lib/githubevents';
import {
	aggregateEventsByNameAndType,
	filterEventsByMonthKey,
	formatEventListLine,
	type GithubEventNameTypeRow,
} from '@/lib/githubEventList';
import { ActivityLineChart } from './activity-chart';
import styles from './page.module.css';

export type LeftBottomLabels = {
	chartTitle: string;
	monthEventListCaption: string;
	monthEventsEmptyNoActivity: string;
	monthEventsEmptyFuture: string;
};

type LeftBottomCardClientProps = {
	points: ActivityMonthPoint[];
	events: GithubPublicEventSummary[];
	labels: LeftBottomLabels;
};

export function LeftBottomCardClient({
	points,
	events,
	labels,
}: LeftBottomCardClientProps) {
	const [selectedMonthIndex, setSelectedMonthIndex] = useState(
		() => new Date().getUTCMonth(),
	);

	const selectedPoint = points[selectedMonthIndex];

	const { eventRows, isFuture } = useMemo(() => {
		if (!selectedPoint) {
			return { eventRows: [] as GithubEventNameTypeRow[], isFuture: false };
		}
		const filtered = filterEventsByMonthKey(events, selectedPoint.key);
		return {
			eventRows: aggregateEventsByNameAndType(filtered),
			isFuture: selectedPoint.isFutureMonth,
		};
	}, [events, selectedPoint]);

	const eventSectionLabel = selectedPoint
		? `${selectedPoint.label} · ${labels.monthEventListCaption}`
		: labels.chartTitle;

	return (
		<div className={styles.box}>
			<h3 className={styles.chartHeading}>{labels.chartTitle}</h3>
			<div className={styles.chartBlock}>
				<ActivityLineChart
					points={points}
					chartTitle={labels.chartTitle}
					selectedMonthIndex={selectedMonthIndex}
					onMonthSelect={setSelectedMonthIndex}
				/>
			</div>

			<section
				className={styles.eventSection}
				aria-label={eventSectionLabel}
			>
				{selectedPoint ? (
					<h4 className={styles.monthEventHeading}>
						{selectedPoint.label} · {labels.monthEventListCaption}
					</h4>
				) : null}

				{isFuture ? (
					<p className={styles.monthEventEmpty}>{labels.monthEventsEmptyFuture}</p>
				) : eventRows.length === 0 ? (
					<p className={styles.monthEventEmpty}>{labels.monthEventsEmptyNoActivity}</p>
				) : (
					<ul className={styles.eventList}>
						{eventRows.map((row) => (
							<li
								key={`${row.rawName}\0${row.type}`}
								className={styles.eventRow}
							>
								<code className={styles.eventLine}>{formatEventListLine(row)}</code>
							</li>
						))}
					</ul>
				)}
			</section>
		</div>
	);
}
