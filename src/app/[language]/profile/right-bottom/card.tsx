import { fetchSiteGithubUserRepos } from '@/lib/github';
import styles from './page.module.css';

export default async function RightBottomCard() {
	const repos = await fetchSiteGithubUserRepos();

	return (
		<div className={styles.box}>
			<pre>{JSON.stringify(repos, null, 2)}</pre>
		</div>
	);
}
