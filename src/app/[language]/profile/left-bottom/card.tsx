import { getDictionary, type Locale } from '@/dictionaries';
import { fetchGithubContributionsSummary } from '@/lib/githubcontributions';
import { summarizeContributionCalendarToActivityMonthPoints } from '@/lib/githubevents';
import { LeftBottomCardClient } from './left-bottom-card-client';

export default async function LeftBottomCard({ locale }: { locale: Locale }) {
	const [summary, dictionary] = await Promise.all([
		fetchGithubContributionsSummary(locale),
		getDictionary(locale),
	]);

	const year = new Date().getUTCFullYear();
	const yearDays =
		summary?.yearCalendars?.find((yc) => yc.year === year)?.calendarDays ?? [];

	const points = summarizeContributionCalendarToActivityMonthPoints(yearDays, {
		locale,
	});

	const p = dictionary.profile;

	return (
		<LeftBottomCardClient points={points} chartTitle={p.activityChartTitle} />
	);
}
