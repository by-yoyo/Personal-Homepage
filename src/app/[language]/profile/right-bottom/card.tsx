import { getDictionary, type Locale } from '@/dictionaries';
import { fetchSiteGithubUserRepos } from '@/lib/github';
import { RightBottomCardClient } from './right-bottom-card-client';

export default async function RightBottomCard({ locale }: { locale: Locale }) {
	const repos = await fetchSiteGithubUserRepos();
	const dictionary = await getDictionary(locale);
	const labels = dictionary.profile.repositories;

	return (
		<RightBottomCardClient repos={repos} locale={locale} labels={labels} />
	);
}
