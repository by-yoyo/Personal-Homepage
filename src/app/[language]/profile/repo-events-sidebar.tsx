'use client';

import type { GithubRepoEvent } from '@/lib/github';
import { localeToBCP47, type Locale } from '@/dictionaries';
import styles from './repo-events-sidebar.module.css';

type RepoEventsSidebarProps = {
	events: GithubRepoEvent[];
	locale: Locale;
	eventsTitle: string;
	eventTypeLabels: Record<string, string>;
};

function formatEventDate(iso: string, locale: Locale): string {
	if (!iso) return '—';
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	return d.toLocaleString(localeToBCP47(locale), {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}

function getEventTypeLabel(type: string, labels: Record<string, string>): string {
	return labels[type] || type;
}

export function RepoEventsSidebar({ events, locale, eventsTitle, eventTypeLabels }: RepoEventsSidebarProps) {
	if (events.length === 0) return null;

	return (
		<div className={styles.sidebar}>
			<h4 className={styles.title}>{eventsTitle}</h4>
			<ul className={styles.list}>
				{events.map((event) => (
					<li key={event.id} className={styles.item}>
						<div className={styles.type}>{getEventTypeLabel(event.type, eventTypeLabels)}</div>
						<time className={styles.time} dateTime={event.created_at}>
							{formatEventDate(event.created_at, locale)}
						</time>
					</li>
				))}
			</ul>
		</div>
	);
}
