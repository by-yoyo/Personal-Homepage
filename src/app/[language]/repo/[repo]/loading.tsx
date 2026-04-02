import styles from './page.module.css';

export default function RepoDetailLoading() {
	return (
		<section className={styles.wrap} aria-label='loading repository'>
			<div className={styles.card}>
				<header className={styles.header}>
					<div className={styles.headerLeft}>
						<div className={styles.loadingLineSm} />
						<div className={styles.loadingLineMd} />
					</div>
				</header>

				<div className={styles.loadingLineLg} />
				<div className={styles.loadingLineMd} style={{ marginTop: '0.45rem' }} />

				<div className={styles.loadingGrid}>
					{Array.from({ length: 8 }).map((_, idx) => (
						<div key={idx} className={styles.loadingItem} />
					))}
				</div>
			</div>
		</section>
	);
}

