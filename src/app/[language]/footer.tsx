import { Mail, Settings, Sparkles, User } from 'lucide-react';
import type { Locale } from '@/dictionaries';
import styles from './footer.module.css';

export default function Footer({ locale }: { locale: Locale }) {
	void locale; // locale 目前未用于页脚，但保留了 props 以便后续做本地化
	return (
		<footer className={styles.footer}>
			<input
				id='footer-action-toggle'
				type='checkbox'
				className={styles.toggle}
				aria-hidden='true'
			/>

			<div className={styles.actionWrap}>
				<label
					htmlFor='footer-action-toggle'
					className={styles.mainBtn}
				>
					<Sparkles size={18} strokeWidth={3} />
				</label>

				<button
					type='button'
					className={`${styles.subBtn} ${styles.sub1}`}
					title='邮件'
				>
					<Mail size={16} strokeWidth={3} />
				</button>
				<button
					type='button'
					className={`${styles.subBtn} ${styles.sub2}`}
					title='用户'
				>
					<User size={16} strokeWidth={3} />
				</button>
				<button
					type='button'
					className={`${styles.subBtn} ${styles.sub3}`}
					title='设置'
				>
					<Settings size={16} strokeWidth={3} />
				</button>
				<button
					type='button'
					className={`${styles.subBtn} ${styles.sub4}`}
					title='更多'
				>
					<Sparkles size={16} strokeWidth={3} />
				</button>
			</div>
		</footer>
	);
}

