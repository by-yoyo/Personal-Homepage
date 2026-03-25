import React from 'react';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Navbar from './navbar';
import ThreeScene from '@/components/threescene';
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

	return (
		<html lang={locale}>
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
				<div className='relative z-10 flex-1 pt-[66px]'>{children}</div>
				{/* 背景 */}

				{/* 3D 场景 */}
				{/*
				<div className='absolute inset-0 -z-10 pointer-events-none'>
					<ThreeScene className='h-full min-h-screen' />
				</div>
				<div className='absolute inset-0 -z-10 pointer-events-none bg-cover bg-center bg-no-repeat layout-bg' />
				*/}
				<div className='absolute inset-0 -z-10 pointer-events-none'>
					<ThreeScene className='h-full min-h-screen' />
				</div>
			</body>
		</html>
	);
}
