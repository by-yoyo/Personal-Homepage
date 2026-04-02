'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function BackToProfileButton({
	locale,
	label,
}: {
	locale: string;
	label: string;
}) {
	const router = useRouter();
	const profileHref = `/${locale}/profile`;

	useEffect(() => {
		router.prefetch(profileHref);
	}, [router, profileHref]);

	return (
		<button
			type='button'
			className={styles.backLinkButton}
			onClick={() => {
				if (window.history.length > 1) {
					router.back();
					return;
				}
				router.push(profileHref);
			}}>
			← {label}
		</button>
	);
}

