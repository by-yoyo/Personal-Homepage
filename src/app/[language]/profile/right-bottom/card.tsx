import type { Locale } from '@/dictionaries';
import { fetchSiteGithubUserRepos } from '@/lib/github';
import { RightBottomCardClient } from './right-bottom-card-client';

export default async function RightBottomCard({ locale }: { locale: Locale }) {
	const repos = await fetchSiteGithubUserRepos();

	const labels =
		locale === 'zh'
			? {
					cardTitle: '我所拥有的公开仓库',
					empty: '暂无公开仓库数据。',
					noDesc: '无描述',
					created: '创建',
					updated: '更新',
					pushed: '推送',
					languagesHeading: '语言占比（字节）',
					languagesTotal: '合计',
					languagesFailed: '无法加载语言统计',
					languagesLoading: '正在加载语言统计…',
					prev: '上一页',
					next: '下一页',
					paginationAria: '仓库分页',
				}
			: {
					cardTitle: 'My public repositories',
					empty: 'No public repository data.',
					noDesc: 'No description',
					created: 'Created',
					updated: 'Updated',
					pushed: 'Pushed',
					languagesHeading: 'Language mix (bytes)',
					languagesTotal: 'Total',
					languagesFailed: 'Could not load language stats',
					languagesLoading: 'Loading language stats…',
					prev: 'Previous',
					next: 'Next',
					paginationAria: 'Repository pages',
				};

	return (
		<RightBottomCardClient repos={repos} locale={locale} labels={labels} />
	);
}
