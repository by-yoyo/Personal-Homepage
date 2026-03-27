'use client';
import { House, Image, Moon, Repeat, Settings, Sun } from 'lucide-react';
import type { Locale } from '@/dictionaries';
import styles from './footer.module.css';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { BACKGROUND_REFRESH_EVENT, BACKGROUND_TOGGLE_EVENT } from './ui-state';

const subButtons = [
	{ key: 'sub1', Icon: Image },
	{ key: 'sub2', Icon: Repeat },
	{ key: 'sub3', Icon: House },
	{ key: 'sub4' }
] as const;

type SubKey = (typeof subButtons)[number]['key'];
const THEME_STORAGE_KEY = 'theme';

function readThemeIsDark() {
	if (typeof window === 'undefined') return false;
	const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
	if (saved === 'dark') return true;
	if (saved === 'light') return false;
	return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export default function Footer({ locale }: { locale: Locale }) {
	const router = useRouter();
	const isDark = useSyncExternalStore(
		(onStoreChange) => {
			const media = window.matchMedia('(prefers-color-scheme: dark)');
			const handleSystemThemeChange = () => {
				if (!window.localStorage.getItem(THEME_STORAGE_KEY)) onStoreChange();
			};
			window.addEventListener('storage', onStoreChange);
			window.addEventListener('themechange', onStoreChange);
			media.addEventListener('change', handleSystemThemeChange);
			return () => {
				window.removeEventListener('storage', onStoreChange);
				window.removeEventListener('themechange', onStoreChange);
				media.removeEventListener('change', handleSystemThemeChange);
			};
		},
		readThemeIsDark,
		() => false
	);

	const [animState, setAnimState] = useState<'closed' | 'opening' | 'closing'>('closed');
	const [spinNonce, setSpinNonce] = useState(0);
	const closingTimerRef = useRef<number | null>(null);
	const animStartAtRef = useRef<number | null>(null);
	const actionWrapRef = useRef<HTMLDivElement | null>(null);

	const subRefs = useRef<Record<SubKey, HTMLButtonElement | null>>({
		sub1: null,
		sub2: null,
		sub3: null,
		sub4: null
	});

	const subKeys = subButtons.map((item) => item.key);

	useEffect(() => {
		document.documentElement.classList.toggle('dark', isDark);
	}, [isDark]);

	function toggleTheme() {
		const nextIsDark = !isDark;
		document.documentElement.classList.toggle('dark', nextIsDark);
		window.localStorage.setItem(THEME_STORAGE_KEY, nextIsDark ? 'dark' : 'light');
		document.cookie = `theme=${nextIsDark ? 'dark' : 'light'}; path=/; max-age=31536000; samesite=lax`;
		window.dispatchEvent(new Event('themechange'));
	}

	function setFromVarsFromCurrent(el: HTMLElement) {
		const cs = getComputedStyle(el);
		const transform = cs.transform;
		const opacity = Number.parseFloat(cs.opacity || '0') || 0;
		const pointerEvents = cs.pointerEvents;

		let tx = -15;
		let ty = -15;
		let scale = 0.45;
		try {
			// DOMMatrix 能同时解析 matrix() / matrix3d()，平移位于 m41/m42
			const dom = new DOMMatrix(transform === 'none' ? undefined : transform);
			tx = dom.m41;
			ty = dom.m42;
			const sx = Math.sqrt(dom.m11 * dom.m11 + dom.m12 * dom.m12);
			const sy = Math.sqrt(dom.m22 * dom.m22 + dom.m21 * dom.m21);
			scale = (sx + sy) / 2 || scale;
		} catch {
			// keep fallback defaults
		}

		el.style.setProperty('--from-x', `${tx}px`);
		el.style.setProperty('--from-y', `${ty}px`);
		el.style.setProperty('--from-scale', `${scale}`);
		el.style.setProperty('--from-opacity', `${opacity}`);
		el.style.setProperty('--from-pointer-events', pointerEvents || 'none');
	}

	function toggle() {
		// 通过更新 key 触发图标重新渲染，从而每次点击都能重新播放 360deg 旋转动画
		const now = performance.now();
		setSpinNonce((v) => v + 1);

		// 清理上一段关闭计时器，避免用户快速连点导致状态错乱
		if (closingTimerRef.current) {
			window.clearTimeout(closingTimerRef.current);
			closingTimerRef.current = null;
		}

		// opening 时点击 => closing；其他状态（closed/在中途 closing）=> opening
		const next: 'opening' | 'closing' = animState === 'opening' ? 'closing' : 'opening';

		// A3：打断时持续的时间只对“展开(opening)”生效
		// - closing -> opening：用 closing 已过去的时间作为 opening 的旋转时长
		// - opening -> closing：无论是否打断，收起旋转都固定为收起时长
		const startedAt = animStartAtRef.current;
		const elapsed = startedAt == null ? 0 : now - startedAt;
		const fullOpeningMs = 970;
		const fullClosingMs = 420;

		let nextSpinMs: number;
		if (next === 'opening') nextSpinMs = animState === 'closing' ? elapsed : fullOpeningMs;
		else nextSpinMs = fullClosingMs;

		// 避免过短导致用户感觉不到动画
		const maxSpinMs = next === 'closing' ? fullClosingMs : fullOpeningMs;
		const clampedSpinMs = Math.max(80, Math.min(nextSpinMs, maxSpinMs));
		// 写入到父容器，让 span 动画获取到同一次的时长
		actionWrapRef.current?.style.setProperty('--spin-duration', `${clampedSpinMs}ms`);

		// 切换到 closing 前，读取“当前按钮真实位置”，写入 CSS 变量给收起动画的 0% 使用。
		if (next === 'closing') {
			for (const key of subKeys) {
				const el = subRefs.current[key];
				if (!el) continue;
				setFromVarsFromCurrent(el);
			}
		}

		// 记录这次“主按钮旋转/子按钮展开/收起”的起始时间，用于 A3 计算
		animStartAtRef.current = now;

		setAnimState(next);

		// closing 的动画时长为 420ms，结束后回到 closed 基础态
		if (next === 'closing') {
			closingTimerRef.current = window.setTimeout(() => {
				animStartAtRef.current = null;
				setAnimState('closed');
			}, 420);
		}
	}

	return (
		<footer className={styles.footer}>

			<div
				className={styles.actionWrap}
				data-anim={animState}
				ref={actionWrapRef}
			>
				<button
					type='button'
					className={styles.mainBtn}
					aria-label='footer actions toggle'
					onClick={toggle}
				>
					<span
						key={spinNonce}
						className={
							animState === 'opening'
								? styles.mainIconSpinLeft
								: animState === 'closing'
									? styles.mainIconSpinRight
									: styles.mainIcon
						}
					>
						<Settings size={18} strokeWidth={3} />
					</span>
				</button>

				{subButtons.map((btn) => {
					const { key } = btn;

					let onClick: (() => void) | undefined;
					switch (key) {
						case 'sub1':
							onClick = () =>
								window.dispatchEvent(new Event(BACKGROUND_REFRESH_EVENT));
							break;
						case 'sub2':
							onClick = () =>
								window.dispatchEvent(new Event(BACKGROUND_TOGGLE_EVENT));
							break;
						case 'sub3':
							onClick = () => router.push(`/${locale}/profile`);
							break;
						case 'sub4':
							onClick = toggleTheme;
							break;
					}

					const ariaLabel: string =
						key === 'sub1'
							? '更多功能'
							: key === 'sub2'
								? '用户'
								: key === 'sub3'
									? '设置'
									: '昼夜切换';
					const Icon =
						key === 'sub4'
							? isDark
								? Moon
								: Sun
							: btn.Icon;

					return (
						<button
							key={key}
							type='button'
							className={`${styles.subBtn} ${styles[key]}`}
							aria-label={ariaLabel}
							onClick={onClick}
							ref={(el) => {
								subRefs.current[key] = el;
							}}
						>
							<Icon size={16} strokeWidth={3} />
						</button>
					);
				})}
			</div>
		</footer>
	);
}

