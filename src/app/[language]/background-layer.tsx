'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import ThreeScene from '@/components/threescene';
import {
	BACKGROUND_MODE_IMAGE,
	BACKGROUND_MODE_SCENE,
	BACKGROUND_RANDOM_IMAGE_API,
	BACKGROUND_REFRESH_EVENT,
	BACKGROUND_MODE_STORAGE_KEY,
	BACKGROUND_TOGGLE_EVENT,
	type BackgroundMode,
} from './ui-state';

export default function BackgroundLayer({
	initialMode,
}: {
	initialMode: BackgroundMode;
}) {
	const [showScene, setShowScene] = useState(initialMode === BACKGROUND_MODE_SCENE);
	const [bgFadeTick, setBgFadeTick] = useState(0);
	const showSceneRef = useRef(showScene);
	const refreshSeqRef = useRef(0);
	const setBackgroundVar = useCallback((name: string, value: string) => {
		document.documentElement.style.setProperty(name, value);
	}, []);
	const refreshRandomBackground = useCallback(() => {
		const seq = ++refreshSeqRef.current;
		const url = `${BACKGROUND_RANDOM_IMAGE_API}?t=${Date.now()}`;
		const nextBgCss = `url("${url}")`;
		const preload = new Image();
		preload.onload = () => {
			if (seq !== refreshSeqRef.current) return;
			setBackgroundVar('--layout-random-bg-url', nextBgCss);
			setBgFadeTick((v) => v + 1);
		};
		preload.onerror = () => {
			console.warn('[BackgroundLayer] 随机图预加载失败:', url);
		};
		preload.src = url;
	}, [setBackgroundVar]);

	useEffect(() => {
		showSceneRef.current = showScene;
	}, [showScene]);

	useEffect(() => {
		const fallback = `url("${BACKGROUND_RANDOM_IMAGE_API}")`;
		setBackgroundVar('--layout-random-bg-url', fallback);
	}, [setBackgroundVar]);

	useEffect(() => {
		const mode = showScene ? BACKGROUND_MODE_SCENE : BACKGROUND_MODE_IMAGE;
		window.localStorage.setItem(BACKGROUND_MODE_STORAGE_KEY, mode);
		document.cookie = `background-mode=${mode}; path=/; max-age=31536000; samesite=lax`;
	}, [showScene]);

	useEffect(() => {
		const handleToggle = () => {
			const next = !showSceneRef.current;
			// 切到 3D 时延后一帧挂载 Canvas，优先让按钮点击反馈先渲染。
			if (next) {
				window.requestAnimationFrame(() => setShowScene(true));
				return;
			}
			setShowScene(false);
		};
		const handleRefresh = () => refreshRandomBackground();
		window.addEventListener(BACKGROUND_TOGGLE_EVENT, handleToggle);
		window.addEventListener(BACKGROUND_REFRESH_EVENT, handleRefresh);
		return () => {
			window.removeEventListener(BACKGROUND_TOGGLE_EVENT, handleToggle);
			window.removeEventListener(BACKGROUND_REFRESH_EVENT, handleRefresh);
		};
	}, [refreshRandomBackground]);

	if (showScene) {
		return (
			<div className='absolute inset-0 -z-10 pointer-events-none'>
				<ThreeScene className='h-full min-h-screen' />
			</div>
		);
	}

	return (
		<div
			key={bgFadeTick}
			className='absolute inset-0 -z-10 pointer-events-none bg-cover bg-center bg-no-repeat layout-bg layout-bg-fade'
		/>
	);
}
