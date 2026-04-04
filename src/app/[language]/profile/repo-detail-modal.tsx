'use client';

import { useEffect, useRef } from 'react';
import type { GithubRepoSummary, GithubRepoEvent } from '@/lib/github';
import type { Locale } from '@/dictionaries';
import styles from './repo-detail-modal.module.css';

export type RepoDetailModalProps = {
	repo: GithubRepoSummary;
	events: GithubRepoEvent[];
	locale: Locale;
	labels: {
		modalTitle: string;
		openOnGithub: string;
		noDesc: string;
		created: string;
		updated: string;
		pushed: string;
		eventsTitle: string;
	};
	onClose: () => void;
};

function formatRepoDate(iso: string, locale: Locale): string {
	if (!iso) return '—';
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	return d.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	});
}

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

export function RepoDetailModal({ repo, events, locale, labels, onClose }: RepoDetailModalProps) {
	const overlayRef = useRef<HTMLDivElement>(null);
	const zh = locale === 'zh';

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose();
		};
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	}, [onClose]);

	const handleOverlayClick = (e: React.MouseEvent) => {
		if (e.target === overlayRef.current) {
			onClose();
		}
	};

	return (
		<div
			className={styles.modalOverlay}
			ref={overlayRef}
			onClick={handleOverlayClick}
			role="dialog"
			aria-modal="true"
			aria-label={labels.modalTitle}>
			<div className={styles.modalContent}>
				<div className={styles.modalHeader}>
					<h2 className={styles.modalTitle}>{labels.modalTitle}</h2>
					<button
						type="button"
						className={styles.modalClose}
						onClick={onClose}
						aria-label={zh ? '关闭' : 'Close'}>
						×
					</button>
				</div>

				<div className={styles.modalBody}>
					<div className={styles.modalNameRow}>
						<div className={styles.modalNameBlock}>
							<h3 className={styles.modalRepoName}>
								{repo.full_name || repo.name}
							</h3>
							<p className={styles.modalRepoDesc}>
								{repo.description?.trim() || labels.noDesc}
							</p>
						</div>
						<a
							className={styles.modalGhLink}
							href={`https://github.com/${repo.full_name || repo.name}`}
							target="_blank"
							rel="noreferrer">
							{labels.openOnGithub}
						</a>
					</div>

					<div className={styles.modalMetaGrid}>
						<div className={styles.modalMetaItem}>
							<div className={styles.modalMetaLabel}>{zh ? '语言' : 'Language'}</div>
							<div className={styles.modalMetaValue}>{repo.language || '—'}</div>
						</div>
						<div className={styles.modalMetaItem}>
							<div className={styles.modalMetaLabel}>{zh ? '星标' : 'Stars'}</div>
							<div className={styles.modalMetaValue}>{repo.stargazers_count}</div>
						</div>
						<div className={styles.modalMetaItem}>
							<div className={styles.modalMetaLabel}>{zh ? 'Forks' : 'Forks'}</div>
							<div className={styles.modalMetaValue}>{repo.forks_count}</div>
						</div>
						<div className={styles.modalMetaItem}>
							<div className={styles.modalMetaLabel}>{zh ? 'Issues' : 'Issues'}</div>
							<div className={styles.modalMetaValue}>{repo.open_issues}</div>
						</div>
						<div className={styles.modalMetaItem}>
							<div className={styles.modalMetaLabel}>{zh ? '订阅者' : 'Watchers'}</div>
							<div className={styles.modalMetaValue}>{repo.watchers_count}</div>
						</div>
						<div className={styles.modalMetaItem}>
							<div className={styles.modalMetaLabel}>{zh ? 'Git URL' : 'Git URL'}</div>
							<div className={styles.modalMetaValue}>{repo.git_url || '—'}</div>
						</div>
						<div className={styles.modalMetaItem}>
							<div className={styles.modalMetaLabel}>{zh ? '创建于' : 'Created'}</div>
							<div className={styles.modalMetaValue}>{formatRepoDate(repo.created_at, locale)}</div>
						</div>
						<div className={styles.modalMetaItem}>
							<div className={styles.modalMetaLabel}>{zh ? '最近更新' : 'Updated'}</div>
							<div className={styles.modalMetaValue}>{formatRepoDate(repo.updated_at, locale)}</div>
						</div>
						<div className={styles.modalMetaItem}>
							<div className={styles.modalMetaLabel}>{zh ? '最近推送' : 'Pushed'}</div>
							<div className={styles.modalMetaValue}>{formatRepoDate(repo.pushed_at, locale)}</div>
						</div>
						<div className={styles.modalMetaItem}>
							<div className={styles.modalMetaLabel}>{zh ? '许可证' : 'License'}</div>
							<div className={styles.modalMetaValue}>
								{(() => {
									const lic = repo.license;
									const key = lic?.key?.trim() ?? '';
									const name = lic?.name?.trim() ?? '';
									const spdx = lic?.spdx_id?.trim() ?? '';
									if (!key && !name && !spdx) return zh ? '无' : 'None';
									const parts: string[] = [];
									if (spdx) parts.push(spdx);
									if (name && name !== spdx) parts.push(name);
									if (!spdx && key) parts.push(key);
									return parts.join(' · ');
								})()}
							</div>
						</div>
					</div>

					{repo.topics?.length ? (
						<div className={styles.modalTopics}>
							{repo.topics.slice(0, 12).map((t) => (
								<span key={t} className={styles.modalTopicChip}>
									{t}
								</span>
							))}
						</div>
					) : null}

					{events.length > 0 && (
						<div className={styles.eventsSection}>
							<h4 className={styles.eventsTitle}>{labels.eventsTitle}</h4>
							<ul className={styles.eventsList}>
								{events.map((event) => (
									<li key={event.id} className={styles.eventItem}>
										<time className={styles.eventTime} dateTime={event.created_at}>
											{formatEventDate(event.created_at, locale)}
										</time>
										<div className={styles.eventType}>{getEventTypeLabel(event.type, locale)}</div>
									</li>
								))}
							</ul>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
