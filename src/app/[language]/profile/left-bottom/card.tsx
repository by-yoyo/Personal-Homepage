import { getDictionary, type Locale } from '@/dictionaries';
import { fetchSiteGithubUserEventSummariesAll } from '@/lib/github';
import { summarizeGithubEventsCurrentYear } from '@/lib/githubevents';
import { LeftBottomCardClient } from './left-bottom-card-client';

export default async function LeftBottomCard({ locale }: { locale: Locale }) {
	const [events, dictionary] = await Promise.all([
		fetchSiteGithubUserEventSummariesAll(),
		getDictionary(locale),
	]);

	const points = summarizeGithubEventsCurrentYear(events, { locale });
	const p = dictionary.profile;

	return (
		<LeftBottomCardClient
			points={points}
			events={events}
			labels={{
				chartTitle: p.activityChartTitle,
				monthEventListCaption: p.monthEventListCaption,
				monthEventsEmptyNoActivity: p.monthEventsEmptyNoActivity,
				monthEventsEmptyFuture: p.monthEventsEmptyFuture,
			}}
		/>
	);
}
