import React from 'react';
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
	children: React.ReactNode;
	params: Promise<{ language: string }>;
}>) {
	const { language } = await params;
	const locale: Locale = isValidLocale(language) ? language : defaultLocale;
	const dictionary = await getDictionary(locale);
	const cookieStore = await cookies();
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
				<div className='relative z-10 flex-1 pt-[66px] pb-[90px]'>
					{children}
				</div>
				<BackgroundLayer initialMode={initialBackgroundMode} />
				{/* 页脚 */}
				<Footer locale={locale} />
			</body>
		</html>
	);
}
