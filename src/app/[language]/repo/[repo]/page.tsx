import {
	defaultLocale,
	isValidLocale,
	type Locale,
} from '@/dictionaries';
import { fetchSiteGithubRepoDetail } from '@/lib/github';
import BackToProfileButton from './back-to-profile-button';
import styles from './page.module.css';

type PageProps = {
	params: Promise<{ language: string; repo: string }>;
};

function formatRepoDate(iso: string, locale: Locale): string {
	if (!iso) return '—';
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	return d.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	});
}

export default async function RepoDetailPage({ params }: PageProps) {
	const { language, repo } = await params;
	const locale: Locale = isValidLocale(language) ? language : defaultLocale;

	const decodedRepo = decodeURIComponent(repo);
	const detail = await fetchSiteGithubRepoDetail(decodedRepo);

	const zh = locale === 'zh';
	const title = zh ? '仓库详情' : 'Repository details';
	const backLabel = zh ? '返回 Profile' : 'Back to profile';
	const openOnGithub = zh ? '在 GitHub 打开' : 'Open on GitHub';
	const booleanLabel = (v: boolean) => (zh ? (v ? '是' : '否') : v ? 'Yes' : 'No');
	const emptyLicenseLabel = zh ? '此仓库还没有使用协议' : 'This repository does not have a license yet.';

	const notFound = zh
		? '未找到该仓库或无法获取详情。'
		: 'Repository not found or unavailable.';
	const noDesc = zh ? '无描述' : 'No description';

	return (
		<section className={styles.wrap} aria-label={title}>
			<div className={styles.card}>
				<header className={styles.header}>
					<div className={styles.headerLeft}>
						<BackToProfileButton locale={locale} label={backLabel} />
						<h2 className={styles.pageTitle}>{title}</h2>
					</div>
				</header>

				{!detail ? (
					<p className={styles.empty}>{notFound}</p>
				) : (
					<>
						<div className={styles.titleRow}>
							<div className={styles.nameBlock}>
								<h3 className={styles.repoName}>
									{detail.full_name || detail.name}
								</h3>
								<p className={styles.repoDesc}>
									{detail.description?.trim() || noDesc}
								</p>
							</div>
							{detail.html_url ? (
								<a
									className={styles.ghLink}
									href={detail.html_url}
									target='_blank'
									rel='noreferrer'>
									{openOnGithub}
								</a>
							) : null}
						</div>

						<div
							className={styles.metaGrid}
							aria-label={zh ? '仓库元信息' : 'Repository metadata'}>
							<div className={styles.metaItem}>
								<div className={styles.metaLabel}>{zh ? '语言' : 'Language'}</div>
								<div className={styles.metaValue}>{detail.language || '—'}</div>
							</div>
							<div className={styles.metaItem}>
								<div className={styles.metaLabel}>{zh ? '星标' : 'Stars'}</div>
								<div className={styles.metaValue}>{detail.stargazers_count}</div>
							</div>
							<div className={styles.metaItem}>
								<div className={styles.metaLabel}>{zh ? 'Forks' : 'Forks'}</div>
								<div className={styles.metaValue}>{detail.forks_count}</div>
							</div>
							<div className={styles.metaItem}>
								<div className={styles.metaLabel}>{zh ? 'Issues' : 'Issues'}</div>
								<div className={styles.metaValue}>{detail.open_issues_count}</div>
							</div>
							<div className={styles.metaItem}>
								<div className={styles.metaLabel}>
									{zh ? '默认分支' : 'Default branch'}
								</div>
								<div className={styles.metaValue}>
									{detail.default_branch || '—'}
								</div>
							</div>
							<div className={styles.metaItem}>
								<div className={styles.metaLabel}>{zh ? '许可证' : 'License'}</div>
								<div className={styles.metaValue}>
									{(() => {
										const lic = detail.license;
										const key = lic?.key?.trim() ?? '';
										const name = lic?.name?.trim() ?? '';
										const spdx = lic?.spdx_id?.trim() ?? '';
										if (!key && !name && !spdx) return emptyLicenseLabel;
										const parts: string[] = [];
										if (spdx) parts.push(spdx);
										if (name && name !== spdx) parts.push(name);
										if (!spdx && key) parts.push(key);
										return parts.join(' · ');
									})()}
								</div>
							</div>
							<div className={styles.metaItem}>
								<div className={styles.metaLabel}>{zh ? '创建于' : 'Created'}</div>
								<div className={styles.metaValue}>
									{formatRepoDate(detail.created_at, locale)}
								</div>
							</div>
							<div className={styles.metaItem}>
								<div className={styles.metaLabel}>{zh ? '最近更新' : 'Updated'}</div>
								<div className={styles.metaValue}>
									{formatRepoDate(detail.updated_at, locale)}
								</div>
							</div>
							<div className={styles.metaItem}>
								<div className={styles.metaLabel}>{zh ? '最近推送' : 'Pushed'}</div>
								<div className={styles.metaValue}>
									{formatRepoDate(detail.pushed_at, locale)}
								</div>
							</div>
							<div className={styles.metaItem}>
								<div className={styles.metaLabel}>{zh ? '订阅者' : 'Watchers'}</div>
								<div className={styles.metaValue}>{detail.watchers_count}</div>
							</div>
							<div className={styles.metaItem}>
								<div className={styles.metaLabel}>{zh ? '是否私有' : 'Private'}</div>
								<div className={styles.metaValue}>{booleanLabel(detail.private)}</div>
							</div>
							<div className={styles.metaItem}>
								<div className={styles.metaLabel}>{zh ? '是否为 Fork' : 'Fork'}</div>
								<div className={styles.metaValue}>{booleanLabel(detail.fork)}</div>
							</div>
							<div className={styles.metaItem}>
								<div className={styles.metaLabel}>{zh ? '是否归档' : 'Archived'}</div>
								<div className={styles.metaValue}>{booleanLabel(detail.archived)}</div>
							</div>
							<div className={styles.metaItem}>
								<div className={styles.metaLabel}>{zh ? '是否禁用' : 'Disabled'}</div>
								<div className={styles.metaValue}>{booleanLabel(detail.disabled)}</div>
							</div>
							<div className={styles.metaItem}>
								<div className={styles.metaLabel}>{zh ? '有 Issues' : 'Has issues'}</div>
								<div className={styles.metaValue}>{booleanLabel(detail.has_issues)}</div>
							</div>
							<div className={styles.metaItem}>
								<div className={styles.metaLabel}>
									{zh ? '有 Projects' : 'Has projects'}
								</div>
								<div className={styles.metaValue}>{booleanLabel(detail.has_projects)}</div>
							</div>
							<div className={styles.metaItem}>
								<div className={styles.metaLabel}>{zh ? '有 Wiki' : 'Has wiki'}</div>
								<div className={styles.metaValue}>{booleanLabel(detail.has_wiki)}</div>
							</div>
							<div className={styles.metaItem}>
								<div className={styles.metaLabel}>{zh ? 'Git URL' : 'Git URL'}</div>
								<div className={styles.metaValue}>{detail.git_url || '—'}</div>
							</div>
							<div className={styles.metaItem}>
								<div className={styles.metaLabel}>{zh ? 'SSH URL' : 'SSH URL'}</div>
								<div className={styles.metaValue}>{detail.ssh_url || '—'}</div>
							</div>
							<div className={styles.metaItem}>
								<div className={styles.metaLabel}>{zh ? 'Clone URL' : 'Clone URL'}</div>
								<div className={styles.metaValue}>{detail.clone_url || '—'}</div>
							</div>
							<div className={styles.metaItem}>
								<div className={styles.metaLabel}>{zh ? '主页' : 'Homepage'}</div>
								<div className={styles.metaValue}>{detail.homepage || '—'}</div>
							</div>
						</div>

						{detail.topics?.length ? (
							<div className={styles.topics} aria-label={zh ? '主题' : 'Topics'}>
								{detail.topics.slice(0, 12).map((t) => (
									<span key={t} className={styles.topicChip}>
										{t}
									</span>
								))}
							</div>
						) : null}
					</>
				)}

			</div>
		</section>
	);
}

