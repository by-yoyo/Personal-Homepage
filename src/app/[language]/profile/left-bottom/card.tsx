import { fetchSiteGithubUserEventSummariesAll } from '@/lib/github';
import styles from './page.module.css';

export default async function LeftBottomCard() {
	const events = await fetchSiteGithubUserEventSummariesAll();

	return (
		<div className={styles.box}>
			<pre className={styles.jsonPre}>{JSON.stringify(events, null, 2)}</pre>
		</div>
	);
}
