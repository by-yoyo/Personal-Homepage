'use client';

import {
	memo,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from 'react';
import type { Locale } from '@/dictionaries';
import type { GithubRepoSummary } from '@/lib/github';
import { cn } from '@/lib/utils';
import {
	buildCenteredPageStrip,
	clampOddMiddleSlots,
	clampPageIndex,
} from './repoPagination';
import { RepoPaginationBar } from './repo-pagination-bar';
import styles from './page.module.css';

const REPOS_PER_PAGE = 10;

type RepoSortMode =
	| 'updated_desc'
	| 'updated_asc'
	| 'stars_desc'
	| 'stars_asc';

const SORT_OPTIONS: readonly {
	value: RepoSortMode;
	zh: string;
	en: string;
}[] = [
	{ value: 'updated_desc', zh: '最近更新', en: 'Recently updated' },
	{ value: 'updated_asc', zh: '最远更新', en: 'Oldest update' },
	{ value: 'stars_desc', zh: '最多星标', en: 'Most stars' },
	{ value: 'stars_asc', zh: '最少星标', en: 'Fewest stars' },
] as const;

function parseIsoMs(iso: string): number {
	const t = Date.parse(iso);
	return Number.isNaN(t) ? 0 : t;
}

const compareByRepoSort: Record<
	RepoSortMode,
	(a: GithubRepoSummary, b: GithubRepoSummary) => number
> = {
	updated_desc: (a, b) => parseIsoMs(b.updated_at) - parseIsoMs(a.updated_at),
	updated_asc: (a, b) => parseIsoMs(a.updated_at) - parseIsoMs(b.updated_at),
	stars_desc: (a, b) => b.stargazers_count - a.stargazers_count,
	stars_asc: (a, b) => a.stargazers_count - b.stargazers_count,
};

function sortRepos(
	repos: GithubRepoSummary[],
	mode: RepoSortMode,
): GithubRepoSummary[] {
	return [...repos].sort(compareByRepoSort[mode]);
}

function sortOptionsForLocale(locale: Locale): {
	value: RepoSortMode;
	label: string;
}[] {
	const zh = locale === 'zh';
	return SORT_OPTIONS.map(({ value, zh: lZh, en }) => ({
		value,
		label: zh ? lZh : en,
	}));
}

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

function licenseLabel(license: GithubRepoSummary['license']): string | null {
	if (!license) return null;
	const n = license.name?.trim();
	if (n) return n;
	const spdx = license.spdx_id?.trim();
	if (spdx && spdx !== 'NOASSERTION') return spdx;
	return license.key || null;
}

export type RightBottomRepoLabels = {
	cardTitle: string;
	empty: string;
	noDesc: string;
	created: string;
	updated: string;
	pushed: string;
	prev: string;
	next: string;
	paginationAria: string;
};

function RepoSortMenu({
	locale,
	sortMode,
	onSortChange,
}: {
	locale: Locale;
	sortMode: RepoSortMode;
	onSortChange: (mode: RepoSortMode) => void;
}) {
	const [open, setOpen] = useState(false);
	const rootRef = useRef<HTMLDivElement>(null);
	const listId = useId();

	const options = useMemo(() => sortOptionsForLocale(locale), [locale]);
	const currentLabel =
		options.find((o) => o.value === sortMode)?.label ?? '';

	const sortTriggerAria =
		locale === 'zh' ? '切换列表顺序' : 'Change list order';
	const sortListAria = locale === 'zh' ? '顺序选项' : 'Sort options';

	useEffect(() => {
		if (!open) return;
		const onPointerDown = (e: PointerEvent) => {
			if (
				rootRef.current &&
				!rootRef.current.contains(e.target as Node | null)
			) {
				/** 延后关闭，避免同一次指针操作里的 `click`（如分页）被同步重绘吞掉 */
				queueMicrotask(() => setOpen(false));
			}
		};
		const onKey = (e: globalThis.KeyboardEvent) => {
			if (e.key === 'Escape') setOpen(false);
		};
		document.addEventListener('pointerdown', onPointerDown);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('pointerdown', onPointerDown);
			document.removeEventListener('keydown', onKey);
		};
	}, [open]);

	return (
		<div className={styles.sortControl} ref={rootRef}>
			<div className={styles.sortMenuRoot}>
				<button
					type="button"
					className={styles.sortTrigger}
					aria-label={sortTriggerAria}
					aria-haspopup="listbox"
					aria-expanded={open}
					aria-controls={listId}
					onClick={() => setOpen((v) => !v)}
				>
					<span className={styles.sortTriggerLabel}>{currentLabel}</span>
					<span className={styles.sortChevron} aria-hidden="true">
						▼
					</span>
				</button>
				<ul
					id={listId}
					className={cn(styles.sortPanel, open && styles.sortPanelOpen)}
					role="listbox"
					aria-label={sortListAria}
					aria-hidden={!open}
				>
					{options.map((o) => {
						const selected = sortMode === o.value;
						const optionClass =
							styles.sortOption +
							(selected ? ` ${styles.sortOptionActive}` : '');
						const pick = () => {
							onSortChange(o.value);
							setOpen(false);
						};
						return (
							<li
								key={o.value}
								className={`${styles.sortPanelItem} ${optionClass}`}
								role="option"
								aria-selected={selected}
								tabIndex={open ? 0 : -1}
								onClick={pick}
								onKeyDown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										pick();
									}
								}}
							>
								{o.label}
							</li>
						);
					})}
				</ul>
			</div>
		</div>
	);
}

const RepoEntry = memo(function RepoEntry({
	repo,
	locale,
	labels,
}: {
	repo: GithubRepoSummary;
	locale: Locale;
	labels: RightBottomRepoLabels;
}) {
	const lic = licenseLabel(repo.license);
	const lang = repo.language?.trim() ?? '';
	const hasMetaChips = Boolean(lang || lic);

	const updatedAt = formatRepoDate(repo.updated_at, locale);
	const createdAt = formatRepoDate(repo.created_at, locale);
	const pushedAt = formatRepoDate(repo.pushed_at, locale);
	const updatedTitle = `${labels.updated}${updatedAt}`;

	return (
		<li className={styles.repoItem}>
			<div className={styles.repoTitleRow}>
				<h3 className={styles.repoName}>{repo.name}</h3>
				<div className={styles.repoUpdatedInline} title={updatedTitle}>
					<time
						className={styles.repoUpdatedTime}
						dateTime={repo.updated_at}
					>
						{labels.updated}
						{updatedAt}
					</time>
				</div>
			</div>

			<div className={styles.repoMetaBlock}>
				{hasMetaChips ? (
					<div className={styles.metaRow}>
						{lang ? <span className={styles.chip}>{lang}</span> : null}
						{lic ? (
							<span className={styles.chipMuted} title={lic}>
								{lic}
							</span>
						) : null}
					</div>
				) : null}
				<div className={styles.repoDatesRow}>
					<time
						className={styles.repoDatesSegment}
						dateTime={repo.created_at}
					>
						{labels.created}
						{createdAt}
					</time>
					<span className={styles.repoDatesSep} aria-hidden="true">
						|
					</span>
					<time
						className={styles.repoDatesSegment}
						dateTime={repo.pushed_at}
					>
						{labels.pushed}
						{pushedAt}
					</time>
				</div>
			</div>

			<p className={styles.repoDesc}>
				{repo.description?.trim() || labels.noDesc}
			</p>
		</li>
	);
});

type RightBottomCardClientProps = {
	repos: GithubRepoSummary[];
	locale: Locale;
	labels: RightBottomRepoLabels;
};

export function RightBottomCardClient({
	repos,
	locale,
	labels,
}: RightBottomCardClientProps) {
	const [sortMode, setSortMode] = useState<RepoSortMode>('updated_desc');
	const sortedRepos = useMemo(
		() => sortRepos(repos, sortMode),
		[repos, sortMode],
	);

	const totalPages = Math.max(
		1,
		Math.ceil(sortedRepos.length / REPOS_PER_PAGE),
	);
	const [pageIndex, setPageIndex] = useState(0);

	const handleSortChange = (mode: RepoSortMode) => {
		setSortMode(mode);
		setPageIndex(0);
	};

	const page = clampPageIndex(pageIndex, totalPages);
	const pageRepos = useMemo(() => {
		const start = page * REPOS_PER_PAGE;
		return sortedRepos.slice(start, start + REPOS_PER_PAGE);
	}, [sortedRepos, page]);

	const paginationNavRef = useRef<HTMLElement | null>(null);
	const [middleSlots, setMiddleSlots] = useState(7);

	useEffect(() => {
		const el = paginationNavRef.current;
		if (!el) return;
		const ro = new ResizeObserver((entries) => {
			const w = entries[0]?.contentRect.width ?? 0;
			if (w > 0) setMiddleSlots(clampOddMiddleSlots(w));
		});
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	const slots = useMemo(
		() => buildCenteredPageStrip(totalPages, middleSlots, page),
		[totalPages, middleSlots, page],
	);
	const arrowsTightToPages = totalPages <= middleSlots;

	const hasRepos = repos.length > 0;

	return (
		<div className={styles.box}>
			<header className={styles.toolbar}>
				<h2 className={styles.cardTitle} title={labels.cardTitle}>
					{labels.cardTitle}
				</h2>
				{hasRepos ? (
					<RepoSortMenu
						locale={locale}
						sortMode={sortMode}
						onSortChange={handleSortChange}
					/>
				) : null}
			</header>

			{!hasRepos ? (
				<p className={styles.empty}>{labels.empty}</p>
			) : (
				<>
					<ul className={styles.repoList} aria-label={labels.cardTitle}>
						{pageRepos.map((repo) => (
							<RepoEntry
								key={repo.full_name || repo.name}
								repo={repo}
								locale={locale}
								labels={labels}
							/>
						))}
					</ul>

					{totalPages > 1 ? (
						<RepoPaginationBar
							ref={paginationNavRef}
							slots={slots}
							page={page}
							totalPages={totalPages}
							arrowsTightToPages={arrowsTightToPages}
							setPageIndex={setPageIndex}
							locale={locale}
							prevLabel={labels.prev}
							nextLabel={labels.next}
							navAriaLabel={labels.paginationAria}
						/>
					) : null}
				</>
			)}
		</div>
	);
}
