import { getDictionary, type Locale } from '@/dictionaries';
import { fetchSiteGithubUserEventSummariesAll } from '@/lib/github';
import { summarizeGithubEventsCurrentYear } from '@/lib/githubevents';
import { ActivityLineChart } from './activity-chart';
import styles from './page.module.css';

export default async function LeftBottomCard({ locale }: { locale: Locale }) {
	const [events, dictionary] = await Promise.all([
		fetchSiteGithubUserEventSummariesAll(),
		getDictionary(locale),
	]);

	const points = summarizeGithubEventsCurrentYear(events, { locale });

	return (
		<div className={styles.box}>
			<h3 className={styles.chartHeading}>{dictionary.profile.activityChartTitle}</h3>
			<ActivityLineChart points={points} chartTitle={dictionary.profile.activityChartTitle} />
		</div>
	);
}
