import { getDictionary, type Locale } from '@/dictionaries';
import { fetchGithubContributionsSummary } from '@/lib/githubcontributions';
import ContributionsPanel from './contributions-panel';
import styles from './page.module.css';

export default async function RightTopCard({ locale }: { locale: Locale }) {
	const dictionary = await getDictionary(locale);
	const summary = await fetchGithubContributionsSummary(locale);
	const contributions = dictionary.profile.contributions;

	return (
		<div className={styles.box}>
			<ContributionsPanel
				contributions={contributions}
				summary={summary}
			/>
		</div>
	);
}
