import type { Locale } from '@/dictionaries';
import { fetchSiteGithubUserRepos } from '@/lib/github';
import { RightBottomCardClient } from './right-bottom-card-client';

export default async function RightBottomCard({ locale }: { locale: Locale }) {
	const repos = await fetchSiteGithubUserRepos();

	const labels =
		locale === 'zh'
			? {
					cardTitle: '我的仓库',
					empty: '暂无公开仓库数据。',
					noDesc: '无描述',
					created: '创建于',
					updated: '更新于',
					pushed: '推送于',
					prev: '上一页',
					next: '下一页',
					paginationAria: '仓库分页',
				}
			: {
					cardTitle: 'My repositories',
					empty: 'No public repository data.',
					noDesc: 'No description',
					created: 'Created ',
					updated: 'Updated ',
					pushed: 'Pushed ',
					prev: 'Previous',
					next: 'Next',
					paginationAria: 'Repository pages',
				};

	return (
		<RightBottomCardClient repos={repos} locale={locale} labels={labels} />
	);
}
