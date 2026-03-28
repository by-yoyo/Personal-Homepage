import { fetchSiteGithubUserProfile, fetchSiteGithubUserRepos } from '@/lib/github';
import { getDictionary, type Locale } from '@/dictionaries';

interface PageProps {
	params: Promise<{ language: Locale }>;
}

export default async function ProfilePage({ params }: PageProps) {
	const { language } = await params;
	const dictionary = await getDictionary(language);
	const [githubUser, repos] = await Promise.all([
		fetchSiteGithubUserProfile(),
		fetchSiteGithubUserRepos(),
	]);

	return (
		<div>
			<p>
				<strong>页面标题:</strong> {dictionary.profile.title}
			</p>
			<p>京ICP备1234567890号-999</p>
			<p>京公网安备 110101123456789号</p>
			<pre>{JSON.stringify({ users: githubUser, repos }, null, 2)}</pre>
		</div>
	);
}
