/**
 * GitHub 仓库“全部信息”获取（不做 pick / 映射）
 *
 * 用途：用于 `repo` 详情页展示完整 API 返回内容。
 */

import {
	GITHUB_PROFILE_URL,
	usernameFromGithubProfileUrl,
} from './github';

const GITHUB_API_BASE = 'https://api.github.com';

/** Next.js Data Cache：3600s 重新验证 */
const GITHUB_FETCH_REVALIDATE_SEC = 3600;

function githubRepoApiUrl(fullName: string): string {
	const [owner, repo] = fullName.split('/').filter(Boolean);
	if (!owner || !repo) return `${GITHUB_API_BASE}/repos/`;
	return `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
}

function githubFetchInit(
	init?: RequestInit,
): RequestInit & { next: { revalidate: number } } {
	const h = new Headers(init?.headers);
	if (!h.has('Accept')) h.set('Accept', 'application/vnd.github+json');
	return {
		...init,
		headers: h,
		next: { revalidate: GITHUB_FETCH_REVALIDATE_SEC },
	};
}

export type GithubRepoAll = Record<string, unknown>;

function pickJsonObject(json: unknown): GithubRepoAll | null {
	if (typeof json !== 'object' || json === null) return null;
	return json as GithubRepoAll;
}

/**
 * 获取 `GET /repos/{owner}/{repo}` 的完整 JSON（不裁剪字段）
 * @param fullName `owner/repo`
 */
export async function fetchGithubRepoAll(
	fullName: string,
	init?: RequestInit,
): Promise<GithubRepoAll | null> {
	const url = githubRepoApiUrl(fullName);
	const res = await fetch(url, githubFetchInit(init));
	if (!res.ok) return null;

	const json: unknown = await res.json();
	return pickJsonObject(json);
}

/**
 * 站点固定用户：传 `repo`（仓库名）或 `owner/repo` 均可
 * @param repo 仓库名或 owner/repo
 */
export async function fetchSiteGithubRepoAll(
	repo: string,
	init?: RequestInit,
): Promise<GithubRepoAll | null> {
	const username = usernameFromGithubProfileUrl(GITHUB_PROFILE_URL);
	if (!username) return null;
	const fullName = repo.includes('/') ? repo : `${username}/${repo}`;
	return fetchGithubRepoAll(fullName, init);
}

