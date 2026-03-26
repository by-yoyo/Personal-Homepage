import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { Locale } from '@/dictionaries';
import styles from './footer.module.css';

export default function Footer({ locale }: { locale: Locale }) {
	return (
		<footer className={styles.footer}>
			<div className={styles.inner}>
				<Link
					href={`/${locale}/profile`}
					className={styles.btn}
					aria-label='Profile'
				>
					<ArrowUpRight size={18} strokeWidth={3} />
				</Link>
			</div>
		</footer>
	);
}

