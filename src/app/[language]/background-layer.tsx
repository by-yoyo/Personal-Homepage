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
	const imageLayerRef = useRef<HTMLDivElement | null>(null);
	const refreshSeqRef = useRef(0);
	const setBackgroundVar = useCallback((name: string, value: string) => {
		document.documentElement.style.setProperty(name, value);
	}, []);
	const replayFadeAnimation = useCallback(() => {
		const el = imageLayerRef.current;
		if (!el) return;
		el.classList.remove('layout-bg-fade');
		// 双 RAF：确保“移除类”先被浏览器提交，再添加类，保证每次都重播动画
		window.requestAnimationFrame(() => {
			window.requestAnimationFrame(() => {
				el.classList.add('layout-bg-fade');
			});
		});
	}, []);
	const refreshRandomBackground = useCallback(() => {
		const seq = ++refreshSeqRef.current;
		const url = `${BACKGROUND_RANDOM_IMAGE_API}?t=${Date.now()}`;
		const preload = new Image();
		preload.onload = () => {
			if (seq !== refreshSeqRef.current) return;
			setBackgroundVar('--layout-random-bg-url', `url("${url}")`);
			replayFadeAnimation();
		};
		preload.onerror = () => {
			console.warn('[BackgroundLayer] 随机图预加载失败:', url);
		};
		preload.src = url;
	}, [replayFadeAnimation, setBackgroundVar]);

	useEffect(() => {
		const initialUrl = `url("${BACKGROUND_RANDOM_IMAGE_API}")`;
		setBackgroundVar('--layout-random-bg-url', initialUrl);
	}, [setBackgroundVar]);

	useEffect(() => {
		const el = imageLayerRef.current;
		if (!el) return;
		const handleAnimationEnd = () => {
			el.classList.remove('layout-bg-fade');
		};
		el.addEventListener('animationend', handleAnimationEnd);
		return () => el.removeEventListener('animationend', handleAnimationEnd);
	}, []);

	useEffect(() => {
		const mode = showScene ? BACKGROUND_MODE_SCENE : BACKGROUND_MODE_IMAGE;
		window.localStorage.setItem(BACKGROUND_MODE_STORAGE_KEY, mode);
		document.cookie = `background-mode=${mode}; path=/; max-age=31536000; samesite=lax`;
	}, [showScene]);

	useEffect(() => {
		const handleToggle = () => {
			setShowScene((prev) => {
				if (!prev) {
					window.requestAnimationFrame(() => setShowScene(true));
					return prev;
				}
				return false;
			});
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
			ref={imageLayerRef}
			className='absolute inset-0 -z-10 pointer-events-none bg-cover bg-center bg-no-repeat layout-bg'
		/>
	);
}
