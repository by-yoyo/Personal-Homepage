'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Locale } from '@/dictionaries';
import {
	fetchRepoLanguagesCached,
	peekCachedRepoLanguages,
} from './repo-languages-cache';
import styles from './page.module.css';

export type RepoLanguagesLabels = {
	heading: string;
	total: string;
	failed: string;
	loading: string;
};

function splitFullName(full_name: string): { owner: string; repo: string } | null {
	const parts = full_name.split('/').filter(Boolean);
	if (parts.length !== 2) return null;
	return { owner: parts[0], repo: parts[1] };
}

function computeLanguageRows(
	raw: Record<string, number>,
): { name: string; bytes: number; pct: number }[] {
	const entries = Object.entries(raw).filter(([, b]) => b > 0);
	const total = entries.reduce((s, [, b]) => s + b, 0);
	if (total <= 0) return [];
	return entries
		.sort((a, b) => b[1] - a[1])
		.map(([name, bytes]) => ({
			name,
			bytes,
			pct: (bytes / total) * 100,
		}));
}

/** 常见语言近似 GitHub Linguist 色；其余用名称稳定哈希生成色相 */
const LANG_COLOR_OVERRIDE: Readonly<Record<string, string>> = {
	TypeScript: '#3178c6',
	JavaScript: '#f1e05a',
	HTML: '#e34c26',
	CSS: '#663399',
	SCSS: '#c6538c',
	Sass: '#a53c70',
	Less: '#1d365d',
	Astro: '#ff5a03',
	Svelte: '#ff3e00',
	Vue: '#41b883',
	MDX: '#1b1f24',
	Markdown: '#083fa1',
	Python: '#3572a5',
	Rust: '#dea584',
	Go: '#00add8',
	Java: '#b07219',
	C: '#555555',
	'C++': '#f34b7d',
	'C#': '#178600',
	Ruby: '#701516',
	PHP: '#4f5d95',
	Swift: '#f05138',
	Kotlin: '#a97bff',
	Shell: '#89e051',
	Dockerfile: '#384d54',
	YAML: '#cb171e',
	JSON: '#292929',
	JSONC: '#292929',
	Stylus: '#ff6387',
};

function colorForLanguage(name: string): string {
	const key = Object.keys(LANG_COLOR_OVERRIDE).find(
		(k) => k.toLowerCase() === name.toLowerCase(),
	);
	if (key) return LANG_COLOR_OVERRIDE[key];
	let h = 0;
	for (let i = 0; i < name.length; i++) {
		h = (h * 33 + name.charCodeAt(i)) >>> 0;
	}
	const hue = h % 360;
	return `hsl(${hue} 62% 52%)`;
}

export function RepoLanguages({
	full_name,
	locale,
	labels,
}: {
	full_name: string;
	locale: Locale;
	labels: RepoLanguagesLabels;
}) {
	const rootRef = useRef<HTMLDivElement | null>(null);
	const [inView, setInView] = useState(false);
	const [rows, setRows] = useState<{ name: string; bytes: number; pct: number }[] | null>(
		null,
	);
	const [failed, setFailed] = useState(false);
	const [hoverTip, setHoverTip] = useState<{
		name: string;
		pctLine: string;
	} | null>(null);
	const [tipPos, setTipPos] = useState({ x: 0, y: 0 });

	const parsed = useMemo(() => splitFullName(full_name), [full_name]);

	/** 仅当占位进入视口（或即将进入）后再拉取 */
	useEffect(() => {
		if (!parsed) return;
		const el = rootRef.current;
		if (!el) return;

		const io = new IntersectionObserver(
			(entries) => {
				if (entries.some((e) => e.isIntersecting)) {
					setInView(true);
					io.disconnect();
				}
			},
			{
				root: null,
				rootMargin: '80px 0px',
				threshold: 0,
			},
		);
		io.observe(el);
		return () => io.disconnect();
	}, [parsed]);

	useEffect(() => {
		if (!parsed || !inView) return;

		const { owner, repo } = parsed;

		const cached = peekCachedRepoLanguages(owner, repo);
		if (cached) {
			setFailed(false);
			setRows(computeLanguageRows(cached));
			return;
		}

		const ac = new AbortController();
		setFailed(false);
		setRows(null);

		fetchRepoLanguagesCached(owner, repo, ac.signal)
			.then((raw) => {
				if (ac.signal.aborted) return;
				setRows(computeLanguageRows(raw));
				setFailed(false);
			})
			.catch(() => {
				if (!ac.signal.aborted) {
					setFailed(true);
					setRows([]);
				}
			});

		return () => ac.abort();
	}, [parsed, inView]);

	const nfInt = useMemo(
		() =>
			new Intl.NumberFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
				maximumFractionDigits: 0,
			}),
		[locale],
	);

	const nfPct = useMemo(
		() =>
			new Intl.NumberFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
				minimumFractionDigits: 0,
				maximumFractionDigits: 1,
			}),
		[locale],
	);

	if (!parsed) return null;

	if (!inView) {
		return <div ref={rootRef} className={styles.repoLangObserveWrap} />;
	}

	if (rows === null) {
		return (
			<div ref={rootRef} className={styles.repoLangObserveWrap}>
				<div className={styles.repoLangSection} aria-busy="true">
					<p className={styles.repoLangMuted}>{labels.loading}</p>
				</div>
			</div>
		);
	}

	if (failed) {
		return (
			<div ref={rootRef} className={styles.repoLangObserveWrap}>
				<div className={styles.repoLangSection}>
					<p className={styles.repoLangMuted}>{labels.failed}</p>
				</div>
			</div>
		);
	}

	if (rows.length === 0) {
		return <div ref={rootRef} className={styles.repoLangObserveWrap} />;
	}

	const sumBytes = rows.reduce((s, r) => s + r.bytes, 0);
	const ariaLabel = [
		...rows.map(
			(r) => `${r.name} ${nfPct.format(r.pct)}%, ${nfInt.format(r.bytes)}`,
		),
		`${labels.total} ${nfInt.format(sumBytes)}`,
	].join('; ');

	const floatTip =
		hoverTip &&
		typeof document !== 'undefined' &&
		createPortal(
			<div
				className={styles.repoLangFloatTip}
				style={{ left: tipPos.x, top: tipPos.y }}
				role="tooltip"
			>
				<span className={styles.repoLangFloatTipName}>{hoverTip.name}</span>
				<span className={styles.repoLangFloatTipPct}>{hoverTip.pctLine}</span>
			</div>,
			document.body,
		);

	return (
		<div ref={rootRef} className={styles.repoLangObserveWrap}>
			{floatTip}
			<div className={styles.repoLangSection}>
				<div className={styles.repoLangHeadingRow}>
					<p className={styles.repoLangHeading}>{labels.heading}</p>
					<ul className={styles.repoLangLegend} aria-label={labels.heading}>
						{rows.map((r) => (
							<li key={r.name} className={styles.repoLangLegendItem}>
								<span
									className={styles.repoLangSwatch}
									style={{
										backgroundColor: colorForLanguage(r.name),
									}}
									aria-hidden="true"
								/>
								<span className={styles.repoLangLegendName}>{r.name}</span>
							</li>
						))}
					</ul>
				</div>
				<div
					className={styles.repoLangStripe}
					role="img"
					aria-label={ariaLabel}
				>
					{rows.map((r) => {
						const bg = colorForLanguage(r.name);
						const pctLine = `${nfPct.format(r.pct)}%`;
						return (
							<div
								key={r.name}
								className={styles.repoLangSegmentWrap}
								style={{
									flexGrow: r.pct,
									flexBasis: 0,
								}}
							>
								<div
									className={styles.repoLangSegment}
									style={{ backgroundColor: bg }}
									onMouseEnter={(e) => {
										setHoverTip({
											name: r.name,
											pctLine,
										});
										setTipPos({ x: e.clientX, y: e.clientY });
									}}
									onMouseMove={(e) => {
										setTipPos({ x: e.clientX, y: e.clientY });
									}}
									onMouseLeave={() => setHoverTip(null)}
									title={`${r.name} ${pctLine}`}
								/>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
