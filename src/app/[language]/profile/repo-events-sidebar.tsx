'use client';

import type { GithubRepoEvent } from '@/lib/github';
import type { Locale } from '@/dictionaries';
import styles from './repo-events-sidebar.module.css';

type RepoEventsSidebarProps = {
	events: GithubRepoEvent[];
	locale: Locale;
	eventsTitle: string;
};

function formatEventDate(iso: string, locale: Locale): string {
	if (!iso) return '—';
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	return d.toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}

function getEventTypeLabel(type: string, locale: Locale): string {
	if (locale === 'zh') {
		const labels: Record<string, string> = {
			PushEvent: '推送',
			WatchEvent: '关注',
			CreateEvent: '创建',
			DeleteEvent: '删除',
			ForkEvent: 'Fork',
			IssuesEvent: 'Issue',
			PullRequestEvent: 'Pull Request',
			ReleaseEvent: '发布',
		};
		return labels[type] || type;
	}
	const labels: Record<string, string> = {
		PushEvent: 'Push',
		WatchEvent: 'Watch',
		CreateEvent: 'Create',
		DeleteEvent: 'Delete',
		ForkEvent: 'Fork',
		IssuesEvent: 'Issue',
		PullRequestEvent: 'Pull Request',
		ReleaseEvent: 'Release',
	};
	return labels[type] || type;
}

export function RepoEventsSidebar({ events, locale, eventsTitle }: RepoEventsSidebarProps) {
	if (events.length === 0) return null;

	return (
		<div className={styles.sidebar}>
			<h4 className={styles.title}>{eventsTitle}</h4>
			<ul className={styles.list}>
				{events.map((event) => (
					<li key={event.id} className={styles.item}>
						<div className={styles.type}>{getEventTypeLabel(event.type, locale)}</div>
						<time className={styles.time} dateTime={event.created_at}>
							{formatEventDate(event.created_at, locale)}
						</time>
					</li>
				))}
			</ul>
		</div>
	);
}
