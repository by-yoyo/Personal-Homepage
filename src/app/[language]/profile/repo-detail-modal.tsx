'use client';

import { useEffect, useRef } from 'react';
import type { GithubRepoSummary, GithubRepoEvent } from '@/lib/github';
import { localeToBCP47, type Locale } from '@/dictionaries';
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
		noEvents: string;
		close: string;
		meta: {
			language: string;
			stars: string;
			forks: string;
			issues: string;
			watchers: string;
			gitUrl: string;
			createdAt: string;
			updatedAt: string;
			pushedAt: string;
			license: string;
			none: string;
		};
		eventTypes: Record<string, string>;
	};
	onClose: () => void;
};

function formatRepoDate(iso: string, locale: Locale): string {
	if (!iso) return '—';
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	return d.toLocaleDateString(localeToBCP47(locale), {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	});
}

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

export function RepoDetailModal({ repo, events, locale, labels, onClose }: RepoDetailModalProps) {
	const overlayRef = useRef<HTMLDivElement>(null);

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
						aria-label={labels.close}>
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
							<div className={styles.modalMetaLabel}>{labels.meta.language}</div>
							<div className={styles.modalMetaValue}>{repo.language || '—'}</div>
						</div>
						<div className={styles.modalMetaItem}>
							<div className={styles.modalMetaLabel}>{labels.meta.stars}</div>
							<div className={styles.modalMetaValue}>{repo.stargazers_count}</div>
						</div>
						<div className={styles.modalMetaItem}>
							<div className={styles.modalMetaLabel}>{labels.meta.forks}</div>
							<div className={styles.modalMetaValue}>{repo.forks_count}</div>
						</div>
						<div className={styles.modalMetaItem}>
							<div className={styles.modalMetaLabel}>{labels.meta.issues}</div>
							<div className={styles.modalMetaValue}>{repo.open_issues}</div>
						</div>
						<div className={styles.modalMetaItem}>
							<div className={styles.modalMetaLabel}>{labels.meta.watchers}</div>
							<div className={styles.modalMetaValue}>{repo.watchers_count}</div>
						</div>
						<div className={styles.modalMetaItem}>
							<div className={styles.modalMetaLabel}>{labels.meta.gitUrl}</div>
							<div className={styles.modalMetaValue}>{repo.git_url || '—'}</div>
						</div>
						<div className={styles.modalMetaItem}>
							<div className={styles.modalMetaLabel}>{labels.meta.createdAt}</div>
							<div className={styles.modalMetaValue}>{formatRepoDate(repo.created_at, locale)}</div>
						</div>
						<div className={styles.modalMetaItem}>
							<div className={styles.modalMetaLabel}>{labels.meta.updatedAt}</div>
							<div className={styles.modalMetaValue}>{formatRepoDate(repo.updated_at, locale)}</div>
						</div>
						<div className={styles.modalMetaItem}>
							<div className={styles.modalMetaLabel}>{labels.meta.pushedAt}</div>
							<div className={styles.modalMetaValue}>{formatRepoDate(repo.pushed_at, locale)}</div>
						</div>
						<div className={styles.modalMetaItem}>
							<div className={styles.modalMetaLabel}>{labels.meta.license}</div>
							<div className={styles.modalMetaValue}>
								{(() => {
									const lic = repo.license;
									const key = lic?.key?.trim() ?? '';
									const name = lic?.name?.trim() ?? '';
									const spdx = lic?.spdx_id?.trim() ?? '';
									if (!key && !name && !spdx) return labels.meta.none;
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
										<div className={styles.eventType}>
											{getEventTypeLabel(event.type, labels.eventTypes)}
										</div>
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
