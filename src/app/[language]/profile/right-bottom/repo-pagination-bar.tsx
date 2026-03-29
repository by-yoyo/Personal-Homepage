'use client';

import { forwardRef } from 'react';
import type { Locale } from '@/dictionaries';
import type { PaginationSlot } from './repoPagination';
import { stepPageIndex } from './repoPagination';
import styles from './page.module.css';

type RepoPaginationBarProps = {
	slots: PaginationSlot[];
	page: number;
	totalPages: number;
	/** 页码一次能全显时：左右箭头紧贴页码，不拉散 */
	arrowsTightToPages: boolean;
	setPageIndex: (n: number | ((p: number) => number)) => void;
	locale: Locale;
	prevLabel: string;
	nextLabel: string;
	navAriaLabel: string;
};

export const RepoPaginationBar = forwardRef<HTMLElement, RepoPaginationBarProps>(
	function RepoPaginationBar(
		{
			slots,
			page,
			totalPages,
			arrowsTightToPages,
			setPageIndex,
			locale,
			prevLabel,
			nextLabel,
			navAriaLabel,
		},
		ref,
	) {
		const pageGroupAria = locale === 'zh' ? '页码' : 'Page numbers';
		const navClass =
			styles.pagination +
			(arrowsTightToPages ? ` ${styles.paginationTight}` : '');
		const trackClass =
			styles.pageNumberTrack +
			(arrowsTightToPages ? ` ${styles.pageNumberTrackTight}` : '');

		return (
			<nav
				ref={ref}
				className={navClass}
				aria-label={navAriaLabel}
			>
				<button
					type="button"
					className={styles.pageArrow}
					disabled={page <= 0}
					onClick={() =>
						setPageIndex((p) => stepPageIndex(p, -1, totalPages))
					}
					aria-label={prevLabel}
				>
					‹
				</button>
				<div
					className={trackClass}
					role="group"
					aria-label={pageGroupAria}
				>
					{slots.map((slot, i) => {
						const idx = slot.idx;
						const active = idx === page;
						return (
							<button
								key={`p-${idx}-${i}`}
								type="button"
								className={
									active
										? styles.pageNumBtnActive
										: styles.pageNumBtn
								}
								aria-current={active ? 'page' : undefined}
								aria-label={
									locale === 'zh'
										? `第 ${idx + 1} 页`
										: `Page ${idx + 1}`
								}
								onClick={() => setPageIndex(idx)}
							>
								{idx + 1}
							</button>
						);
					})}
				</div>
				<button
					type="button"
					className={styles.pageArrow}
					disabled={page >= totalPages - 1}
					onClick={() =>
						setPageIndex((p) => stepPageIndex(p, 1, totalPages))
					}
					aria-label={nextLabel}
				>
					›
				</button>
			</nav>
		);
	},
);
