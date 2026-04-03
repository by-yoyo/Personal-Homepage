import { defaultLocale, getDictionary, isValidLocale, type Locale } from '@/dictionaries';
import {
	fetchSiteGithubUserProfile,
	fetchSiteGithubUserRepos,
	fetchSiteGithubUserEventSummariesAll,
} from '@/lib/github';

interface PageProps {
	params: Promise<{ language: Locale }>;
}

export default async function AboutPage({ params }: PageProps) {
	const { language } = await params;
	// About 页不做额外布局展示，但保留字典加载以确保 i18n 元信息不受影响
	await getDictionary(language);
	// 触发语言校验逻辑，避免无效语言进入数据层
	void (isValidLocale(language) ? language : defaultLocale satisfies Locale);

	const [profile, repos, events] = await Promise.all([
		fetchSiteGithubUserProfile(),
		fetchSiteGithubUserRepos(),
		fetchSiteGithubUserEventSummariesAll(),
	]);

	return (
		<div
			style={{
				display: 'flex',
				gap: 16,
				alignItems: 'flex-start',
				overflowX: 'auto',
				padding: '0.5rem',
			}}>
			<pre
				style={{
					margin: 0,
					flex: '1 1 0',
					minWidth: 320,
					whiteSpace: 'pre-wrap',
					wordBreak: 'break-word',
					fontSize: 12,
					lineHeight: 1.5,
				}}>
				{JSON.stringify(profile, null, 2)}
			</pre>
			<pre
				style={{
					margin: 0,
					flex: '1 1 0',
					minWidth: 320,
					whiteSpace: 'pre-wrap',
					wordBreak: 'break-word',
					fontSize: 12,
					lineHeight: 1.5,
				}}>
				{JSON.stringify(repos, null, 2)}
			</pre>
			<pre
				style={{
					margin: 0,
					flex: '1 1 0',
					minWidth: 320,
					whiteSpace: 'pre-wrap',
					wordBreak: 'break-word',
					fontSize: 12,
					lineHeight: 1.5,
				}}>
				{JSON.stringify(events, null, 2)}
			</pre>
		</div>
	);
}

