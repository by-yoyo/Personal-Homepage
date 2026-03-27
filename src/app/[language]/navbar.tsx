import { ChevronUp } from 'lucide-react';
import Link from 'next/link';
import type { Locale } from '@/dictionaries';
import styles from './navbar.module.css';

interface NavbarProps {
	language: Locale;
	labels: {
		brandTitle: string;
		profile: string;
		about: string;
		navblog: string;
		link: string;
	};
}

export default function Navbar({ language, labels }: NavbarProps) {
	return (
		<>
			<input
				id='nav-collapse-toggle'
				type='checkbox'
				className={styles.toggle}
				aria-hidden='true'
			/>

			<nav className={styles.nav}>
				<div className={styles.container}>
					<div className={styles.brand}>
						<Link
							href={`/${language}/profile`}
							className={styles.brandTitle}
						>
							{labels.brandTitle}
						</Link>
					</div>

					<div className={styles.links}>
						<Link href={`/${language}/profile`} className={styles.link}>
							{labels.profile}
						</Link>
						<Link href={`/${language}/link`} className={styles.link}>
							{labels.link}
						</Link>
						<Link href={`/${language}/about`} className={styles.link}>
							{labels.about}
						</Link>
						<a
							href='https://blog.arsfox.com'
							className={styles.link}
							target='_blank'
							rel='noopener noreferrer'
						>
							{labels.navblog}
						</a>
					</div>
				</div>
			</nav>

			{/* 导航栏下方中间装饰：梯形（上宽下窄），与 checkbox+label 组合触发纯 CSS 动画 */}
			<label
				htmlFor='nav-collapse-toggle'
				className={styles.trapezoid}
				aria-label='收起导航'
			>
				<ChevronUp className={styles.trapezoidIcon} strokeWidth={3} />
			</label>
		</>
	);
}
