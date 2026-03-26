'use client';
import { Mail, Settings, Sparkles, User } from 'lucide-react';
import type { Locale } from '@/dictionaries';
import styles from './footer.module.css';
import { useMemo, useRef, useState } from 'react';

export default function Footer({ locale }: { locale: Locale }) {
	void locale; // locale 目前未用于页脚，但保留了 props 以便后续做本地化

	const [animState, setAnimState] = useState<'closed' | 'opening' | 'closing'>('closed');
	const closingTimerRef = useRef<number | null>(null);

	const subRefs = useRef<Record<'sub1' | 'sub2' | 'sub3' | 'sub4', HTMLButtonElement | null>>({
		sub1: null,
		sub2: null,
		sub3: null,
		sub4: null
	});

	const subKeys = useMemo(() => ['sub1', 'sub2', 'sub3', 'sub4'] as const, []);

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
		// 清理上一段关闭计时器，避免用户快速连点导致状态错乱
		if (closingTimerRef.current) {
			window.clearTimeout(closingTimerRef.current);
			closingTimerRef.current = null;
		}

		// opening 时点击 => closing；其他状态（closed/在中途 closing）=> opening
		const next: 'opening' | 'closing' = animState === 'opening' ? 'closing' : 'opening';

		// 切换到 closing 前，读取“当前按钮真实位置”，写入 CSS 变量给收起动画的 0% 使用。
		for (const key of subKeys) {
			const el = subRefs.current[key];
			if (!el) continue;
			setFromVarsFromCurrent(el);
		}

		setAnimState(next);

		// closing 的动画时长为 420ms，结束后回到 closed 基础态
		if (next === 'closing') {
			closingTimerRef.current = window.setTimeout(() => setAnimState('closed'), 420);
		}
	}

	return (
		<footer className={styles.footer}>

			<div className={styles.actionWrap} data-anim={animState}>
				<button
					type='button'
					className={styles.mainBtn}
					aria-label='footer actions toggle'
					onClick={toggle}
				>
					<Sparkles size={18} strokeWidth={3} />
				</button>

				<button
					type='button'
					className={`${styles.subBtn} ${styles.sub1}`}
					title='邮件'
					ref={(el) => {
						subRefs.current.sub1 = el;
					}}
				>
					<Mail size={16} strokeWidth={3} />
				</button>
				<button
					type='button'
					className={`${styles.subBtn} ${styles.sub2}`}
					title='用户'
					ref={(el) => {
						subRefs.current.sub2 = el;
					}}
				>
					<User size={16} strokeWidth={3} />
				</button>
				<button
					type='button'
					className={`${styles.subBtn} ${styles.sub3}`}
					title='设置'
					ref={(el) => {
						subRefs.current.sub3 = el;
					}}
				>
					<Settings size={16} strokeWidth={3} />
				</button>
				<button
					type='button'
					className={`${styles.subBtn} ${styles.sub4}`}
					title='更多'
					ref={(el) => {
						subRefs.current.sub4 = el;
					}}
				>
					<Sparkles size={16} strokeWidth={3} />
				</button>
			</div>
		</footer>
	);
}

