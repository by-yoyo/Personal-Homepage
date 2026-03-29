/**
 * 客户端语言统计缓存：分页切走后返回同一仓库不再请求；
 * 并发同一仓库只发一次请求（in-flight 去重）。
 * 数据经 Server Action 调用 {@link fetchGithubRepoLanguages}，与站点其它 GitHub 拉取共用 Data Cache。
 */

import { getRepoLanguagesForRepo } from './get-repo-languages';

const cacheKey = (owner: string, repo: string) =>
	`${owner.toLowerCase()}/${repo.toLowerCase()}`;

const resolved = new Map<string, Record<string, number>>();
const inflight = new Map<string, Promise<Record<string, number>>>();

/** 若已缓存则直接返回（用于避免 loading 闪烁） */
export function peekCachedRepoLanguages(
	owner: string,
	repo: string,
): Record<string, number> | undefined {
	return resolved.get(cacheKey(owner, repo));
}

/**
 * @param signal 保留与调用方兼容；Server Action 无法在服务端取消，忽略。
 */
export async function fetchRepoLanguagesCached(
	owner: string,
	repo: string,
	signal?: AbortSignal,
): Promise<Record<string, number>> {
	void signal;
	const key = cacheKey(owner, repo);
	const hit = resolved.get(key);
	if (hit) return hit;

	let p = inflight.get(key);
	if (!p) {
		p = (async () => {
			const data = await getRepoLanguagesForRepo(owner, repo);
			resolved.set(key, data);
			return data;
		})().finally(() => {
			inflight.delete(key);
		});
		inflight.set(key, p);
	}
	return p;
}
