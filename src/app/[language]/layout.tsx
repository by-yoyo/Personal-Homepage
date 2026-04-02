import type { ReactNode } from 'react';
import { Geist, Geist_Mono } from 'next/font/google';
import { cookies } from 'next/headers';
import './globals.css';
import Navbar from './navbar';
import Footer from './footer';
import BackgroundLayer from './background-layer';
import { BACKGROUND_MODE_IMAGE, BACKGROUND_MODE_SCENE } from './ui-state';
import {
	defaultLocale,
	getDictionary,
	isValidLocale,
	type Locale,
} from '@/dictionaries';

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin'],
});

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin'],
});

export default async function RootLayout({
	children,
	params,
}: Readonly<{
	children: ReactNode;
	params: Promise<{ language: string }>;
}>) {
	const { language } = await params;
	const locale: Locale = isValidLocale(language) ? language : defaultLocale;
	// 并行读取字典与 cookie，减少 RootLayout 的等待时间
	const [dictionary, cookieStore] = await Promise.all([
		getDictionary(locale),
		cookies(),
	]);
	const theme = cookieStore.get('theme')?.value;
	const backgroundMode = cookieStore.get('background-mode')?.value;
	const htmlClassName = theme === 'dark' ? 'dark' : undefined;
	const initialBackgroundMode =
		backgroundMode === BACKGROUND_MODE_IMAGE ? BACKGROUND_MODE_IMAGE : BACKGROUND_MODE_SCENE;

	return (
		<html lang={locale} suppressHydrationWarning className={htmlClassName}>
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col relative`}>
				{/* 导航栏 */}
				<Navbar
					language={locale}
					labels={{
						profile: dictionary.profile.title,
						about: dictionary.about.title,
						brandTitle: dictionary.navbrandTitle,
						navblog: dictionary.navblog,
						link: dictionary.link.title,
					}}
				/>
				{/* 页面的主要内容 */}
				<div className='relative z-10 flex-1 pt-(--app-main-top-pad) pb-(--app-main-bottom-pad)'>
					{children}
				</div>
				{/* 背景层（图片/Three 场景）：位于底层，不参与布局流；初始模式由 cookie 决定 */}
				<BackgroundLayer initialMode={initialBackgroundMode} />
				{/* 页脚 */}
				<Footer locale={locale} />
			</body>
		</html>
	);
}
