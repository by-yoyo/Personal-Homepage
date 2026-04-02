'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './background.module.css';
import {
	BACKGROUND_MODE_IMAGE,
	BACKGROUND_MODE_SCENE,
	BACKGROUND_RANDOM_IMAGE_API,
	BACKGROUND_REFRESH_EVENT,
	BACKGROUND_MODE_STORAGE_KEY,
	BACKGROUND_TOGGLE_EVENT,
	type BackgroundMode,
} from './ui-state';

// ThreeScene 属于重量级依赖（Three.js），按需加载：
// 当用户选择 "scene" 背景模式时才会下载并渲染，减少首屏包体积。
const ThreeScene = dynamic(() => import('@/components/threescene'), {
	ssr: false,
	loading: () => null,
});

export default function BackgroundLayer({
	initialMode,
}: {
	initialMode: BackgroundMode;
}) {
	const wrapperClassName = `-z-10 pointer-events-none ${styles.layoutBgStack}`;
	const imgBaseClassName = `${styles.layoutBgImg} ${styles.layoutBgImgBase}`;
	const imgOverlayClassName = `${styles.layoutBgImg} ${styles.layoutBgImgOverlay}`;

	const [showScene, setShowScene] = useState(
		initialMode === BACKGROUND_MODE_SCENE,
	);
	const [crossfading, setCrossfading] = useState(false);
	const [baseSrc, setBaseSrc] = useState(BACKGROUND_RANDOM_IMAGE_API);
	const [overlaySrc, setOverlaySrc] = useState(BACKGROUND_RANDOM_IMAGE_API);
	const refreshSeqRef = useRef(0);
	const refreshCooldownUntilRef = useRef(0);
	const toggleCooldownUntilRef = useRef(0);
	const crossfadeTimerRef = useRef<number | null>(null);
	// base/overlay 交叉淡入淡出结束后的延迟时间（CSS 动画时长的配套值）
	const CROSSFADE_END_DELAY_MS = 1350;

	const clearCrossfadeTimer = useCallback(() => {
		if (!crossfadeTimerRef.current) return;
		window.clearTimeout(crossfadeTimerRef.current);
		crossfadeTimerRef.current = null;
	}, []);

	const resetCrossfading = useCallback(() => {
		setCrossfading(false);
		clearCrossfadeTimer();
	}, [clearCrossfadeTimer]);

	const setBackgroundVar = useCallback((name: string, value: string) => {
		document.documentElement.style.setProperty(name, value);
	}, []);

	const refreshRandomBackground = useCallback(() => {
		const seq = ++refreshSeqRef.current;
		const url = `${BACKGROUND_RANDOM_IMAGE_API}?t=${Date.now()}`;
		const preload = new Image();

		preload.onload = () => {
			if (seq !== refreshSeqRef.current) return;
			setBackgroundVar('--layout-random-bg-url', `url("${url}")`);

			// 交叉淡入淡出：
			// base 1->0, overlay 0->1（由 data-crossfading + CSS module 选择器控制）
			// 然后把 base 更新为新图，关闭交叉态，方便下一次再次播放。
			setOverlaySrc(url);
			setCrossfading(true);

			if (crossfadeTimerRef.current) {
				window.clearTimeout(crossfadeTimerRef.current);
				crossfadeTimerRef.current = null;
			}

			crossfadeTimerRef.current = window.setTimeout(() => {
				setBaseSrc(url);
				setCrossfading(false);
				crossfadeTimerRef.current = null;
			}, CROSSFADE_END_DELAY_MS);
		};

		preload.onerror = () => {
			console.warn('[BackgroundLayer] 随机图预加载失败:', url);
		};

		preload.src = url;
	}, [setBackgroundVar]);

	useEffect(() => {
		setBackgroundVar(
			'--layout-random-bg-url',
			`url("${BACKGROUND_RANDOM_IMAGE_API}")`
		);
	}, [setBackgroundVar]);

	useEffect(() => {
		const mode = showScene ? BACKGROUND_MODE_SCENE : BACKGROUND_MODE_IMAGE;
		window.localStorage.setItem(BACKGROUND_MODE_STORAGE_KEY, mode);
		document.cookie = `background-mode=${mode}; path=/; max-age=31536000; samesite=lax`;
	}, [showScene]);

	useEffect(() => {
		const handleToggle = () => {
			const now = Date.now();
			if (now < toggleCooldownUntilRef.current) return;
			toggleCooldownUntilRef.current = now + 5000;

			setShowScene((prev) => {
				if (!prev) {
					window.requestAnimationFrame(() => setShowScene(true));
					return prev;
				}
				return false;
			});

			resetCrossfading();
		};
		const handleRefresh = () => {
			const now = Date.now();
			if (now < refreshCooldownUntilRef.current) return;
			refreshCooldownUntilRef.current = now + 2000;
			refreshRandomBackground();
		};
		window.addEventListener(BACKGROUND_TOGGLE_EVENT, handleToggle);
		window.addEventListener(BACKGROUND_REFRESH_EVENT, handleRefresh);
		return () => {
			window.removeEventListener(BACKGROUND_TOGGLE_EVENT, handleToggle);
			window.removeEventListener(BACKGROUND_REFRESH_EVENT, handleRefresh);
		};
	}, [refreshRandomBackground, resetCrossfading]);

	useEffect(() => {
		return () => {
			clearCrossfadeTimer();
		};
	}, [clearCrossfadeTimer]);

	if (showScene) {
		return (
			// Three.js 场景同样作为“背景层”：不参与布局流、不抢指针事件、位于底层。
			<div className={wrapperClassName}>
				<ThreeScene className='h-full min-h-screen' />
			</div>
		);
	}

	return (
		<div
			className={wrapperClassName}
			// 交叉淡入淡出开关：让 CSS module 在 base/overlay 间切换 opacity/filter。
			data-crossfading={crossfading ? 'true' : 'false'}
		>
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img
				className={imgBaseClassName}
				src={baseSrc}
				alt=''
				aria-hidden
			/>
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img
				className={imgOverlayClassName}
				src={overlaySrc}
				alt=''
				aria-hidden
			/>
		</div>
	);
}
