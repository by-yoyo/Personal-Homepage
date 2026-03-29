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

	return (
		<LeftBottomCardClient
			points={points}
			events={events}
			chartTitle={dictionary.profile.activityChartTitle}
			monthEventListCaption={dictionary.profile.monthEventListCaption}
			emptyNoActivity={dictionary.profile.monthEventsEmptyNoActivity}
			emptyFuture={dictionary.profile.monthEventsEmptyFuture}
		/>
	);
}
