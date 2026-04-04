/** GitHub REST；`fetchSite*` 用 {@link GITHUB_PROFILE_URL} 解析用户名。 */

const GITHUB_API_BASE = 'https://api.github.com';

/** Next.js Data Cache：3600s 重新验证（用户/仓库等相对稳态数据） */
const GITHUB_FETCH_REVALIDATE_SEC = 3600;

/** Events 流变化快；单独用较短 revalidate，减轻与 GitHub 实时不一致的观感 */
const GITHUB_EVENTS_FETCH_REVALIDATE_SEC = 120;

const GITHUB_USER_REPOS_PER_PAGE_MAX = 100;
const GITHUB_USER_EVENTS_PER_PAGE_MAX = 100;

/** 聚合后按仓库数排序，仅保留前 N 种语言 */
const LANGUAGES_RANKED_TOP_N = 6;

function devGithubWarn(...args: unknown[]) {
	if (process.env.NODE_ENV === 'development') console.warn('[github]', ...args);
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

function githubFetchInitEvents(
	init?: RequestInit,
): RequestInit & { next: { revalidate: number } } {
	const h = new Headers(init?.headers);
	if (!h.has('Accept')) h.set('Accept', 'application/vnd.github+json');
	return {
		...init,
		headers: h,
		next: { revalidate: GITHUB_EVENTS_FETCH_REVALIDATE_SEC },
	};
}

/** 失败或非数组返回空数组 */
async function fetchGithubJsonArray(
	url: string,
	init?: RequestInit,
): Promise<unknown[]> {
	const res = await fetch(url, githubFetchInit(init));
	if (!res.ok) return [];
	const json: unknown = await res.json();
	return Array.isArray(json) ? json : [];
}

function num(x: unknown): number {
	return typeof x === 'number' ? x : Number(x ?? 0);
}

export const GITHUB_PROFILE_URL = 'https://github.com/Wolffyhtl' as const;

/** profile URL → 用户名，非法则 null */
export function usernameFromGithubProfileUrl(
	profileUrl: string,
): string | null {
	let url: URL;
	try {
		url = new URL(profileUrl.trim());
	} catch {
		return null;
	}
	const host = url.hostname.toLowerCase();
	if (host !== 'github.com' && host !== 'www.github.com') {
		return null;
	}
	const first = url.pathname.split('/').filter(Boolean)[0];
	if (!first) return null;
	if (!/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(first)) {
		return null;
	}
	return first;
}

export type GithubUserProfile = {
	avatar_url: string;
	name: string | null;
	blog: string | null;
	location: string | null;
	bio: string | null;
	public_repos: number;
	followers: number;
	total_stargazers: number;
	/** 仓库主语言按仓库数降序，仅名称，最多 6 个（排名前六） */
	languages_ranked: string[];
	created_at: string;
	updated_at: string;
};

type GithubUserProfileFields = Omit<
	GithubUserProfile,
	'total_stargazers' | 'languages_ranked'
>;

function pickGithubUserProfile(data: unknown): GithubUserProfileFields | null {
	if (typeof data !== 'object' || data === null) return null;
	const o = data as Record<string, unknown>;
	return {
		avatar_url: typeof o.avatar_url === 'string' ? o.avatar_url : '',
		name: o.name === null || o.name === undefined ? null : String(o.name),
		blog: o.blog === null || o.blog === undefined ? null : String(o.blog),
		location:
			o.location === null || o.location === undefined
				? null
				: String(o.location),
		bio: o.bio === null || o.bio === undefined ? null : String(o.bio),
		public_repos:
			typeof o.public_repos === 'number'
				? o.public_repos
				: Number(o.public_repos ?? 0),
		followers:
			typeof o.followers === 'number' ? o.followers : Number(o.followers ?? 0),
		created_at: typeof o.created_at === 'string' ? o.created_at : '',
		updated_at: typeof o.updated_at === 'string' ? o.updated_at : '',
	};
}

export async function fetchGithubUserProfile(
	username: string,
	init?: RequestInit,
): Promise<GithubUserProfile | null> {
	try {
		const res = await fetch(githubUserApiUrl(username), githubFetchInit(init));
		if (!res.ok) {
			devGithubWarn(`GET /users/${username} → ${res.status}`);
			return null;
		}
		const json: unknown = await res.json();
		const profile = pickGithubUserProfile(json);
		if (!profile) return null;

		try {
			const agg = await aggregateUserPublicRepos(username, init);
			return { ...profile, ...agg };
		} catch (e) {
			devGithubWarn(
				'aggregate repos failed, profile without stars/languages',
				e,
			);
			return { ...profile, total_stargazers: 0, languages_ranked: [] };
		}
	} catch (e) {
		devGithubWarn('fetchGithubUserProfile', e);
		return null;
	}
}

export async function fetchSiteGithubUserProfile(
	init?: RequestInit,
): Promise<GithubUserProfile | null> {
	const username = usernameFromGithubProfileUrl(GITHUB_PROFILE_URL);
	return username ? fetchGithubUserProfile(username, init) : null;
}

export function githubUserApiUrl(username: string): string {
	return `${GITHUB_API_BASE}/users/${encodeURIComponent(username)}`;
}

export type GithubRepoLicense = {
	key: string;
	name: string | null;
	spdx_id: string | null;
};

export type GithubRepoSummary = {
	/** `owner/repo`，来自 API 的 `full_name` 或由用户名与 `name` 拼接 */
	full_name: string;
	name: string;
	description: string | null;
	created_at: string;
	updated_at: string;
	pushed_at: string;
	git_url: string;
	ssh_url: string;
	clone_url: string;
	homepage: string | null;
	stargazers_count: number;
	watchers_count: number;
	language: string | null;
	forks_count: number;
	license: GithubRepoLicense | null;
	topics: string[];
	forks: number;
	open_issues: number;
	watchers: number;
};

function pickGithubRepoLicense(data: unknown): GithubRepoLicense | null {
	if (data === null || data === undefined) return null;
	if (typeof data !== 'object') return null;
	const o = data as Record<string, unknown>;
	return {
		key: typeof o.key === 'string' ? o.key : '',
		name: o.name === null || o.name === undefined ? null : String(o.name),
		spdx_id:
			o.spdx_id === null || o.spdx_id === undefined ? null : String(o.spdx_id),
	};
}

function pickTopics(data: unknown): string[] {
	if (!Array.isArray(data)) return [];
	return data.filter((x): x is string => typeof x === 'string');
}

function pickGithubRepo(data: unknown): GithubRepoSummary | null {
	if (typeof data !== 'object' || data === null) return null;
	const o = data as Record<string, unknown>;
	const name = typeof o.name === 'string' ? o.name : '';
	return {
		full_name:
			typeof o.full_name === 'string' && o.full_name.includes('/')
				? o.full_name
				: '',
		name,
		description:
			o.description === null || o.description === undefined
				? null
				: String(o.description),
		created_at: typeof o.created_at === 'string' ? o.created_at : '',
		updated_at: typeof o.updated_at === 'string' ? o.updated_at : '',
		pushed_at: typeof o.pushed_at === 'string' ? o.pushed_at : '',
		git_url: typeof o.git_url === 'string' ? o.git_url : '',
		ssh_url: typeof o.ssh_url === 'string' ? o.ssh_url : '',
		clone_url: typeof o.clone_url === 'string' ? o.clone_url : '',
		homepage:
			o.homepage === null || o.homepage === undefined
				? null
				: String(o.homepage),
		stargazers_count:
			typeof o.stargazers_count === 'number'
				? o.stargazers_count
				: Number(o.stargazers_count ?? 0),
		watchers_count:
			typeof o.watchers_count === 'number'
				? o.watchers_count
				: Number(o.watchers_count ?? 0),
		language:
			o.language === null || o.language === undefined
				? null
				: String(o.language),
		forks_count:
			typeof o.forks_count === 'number'
				? o.forks_count
				: Number(o.forks_count ?? 0),
		license: pickGithubRepoLicense(o.license),
		topics: pickTopics(o.topics),
		forks: typeof o.forks === 'number' ? o.forks : Number(o.forks ?? 0),
		open_issues:
			typeof o.open_issues === 'number'
				? o.open_issues
				: Number(o.open_issues ?? 0),
		watchers:
			typeof o.watchers === 'number' ? o.watchers : Number(o.watchers ?? 0),
	};
}

export function githubUserReposApiUrl(
	username: string,
	query?: { page?: number; per_page?: number },
): string {
	const u = encodeURIComponent(username);
	const sp = new URLSearchParams();
	sp.set('sort', 'pushed');
	if (query?.page != null) sp.set('page', String(query.page));
	if (query?.per_page != null) sp.set('per_page', String(query.per_page));
	return `${GITHUB_API_BASE}/users/${u}/repos?${sp.toString()}`;
}

async function aggregateUserPublicRepos(
	username: string,
	init?: RequestInit,
): Promise<{ total_stargazers: number; languages_ranked: string[] }> {
	let total_stargazers = 0;
	const languageCounts = new Map<string, number>();

	for (let page = 1; ; page++) {
		const items = await fetchGithubJsonArray(
			githubUserReposApiUrl(username, {
				page,
				per_page: GITHUB_USER_REPOS_PER_PAGE_MAX,
			}),
			init,
		);
		if (items.length === 0) break;

		for (const item of items) {
			if (typeof item !== 'object' || item === null) continue;
			const o = item as Record<string, unknown>;
			const n = num(o.stargazers_count);
			if (Number.isFinite(n)) total_stargazers += n;

			const lang = o.language;
			if (typeof lang === 'string' && lang.length > 0) {
				languageCounts.set(lang, (languageCounts.get(lang) ?? 0) + 1);
			}
		}

		if (items.length < GITHUB_USER_REPOS_PER_PAGE_MAX) break;
	}

	const languages_ranked = [...languageCounts.entries()]
		.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'en'))
		.map(([name]) => name)
		.slice(0, LANGUAGES_RANKED_TOP_N);

	return { total_stargazers, languages_ranked };
}

export async function fetchGithubUserRepos(
	username: string,
	init?: RequestInit,
): Promise<GithubRepoSummary[]> {
	const raw = await fetchGithubJsonArray(githubUserReposApiUrl(username), init);
	const listed = raw
		.map(pickGithubRepo)
		.filter((r): r is GithubRepoSummary => r !== null);
	return listed.map((r) => ({
		...r,
		full_name:
			r.full_name.trim().length > 0 ? r.full_name : `${username}/${r.name}`,
	}));
}

export async function fetchSiteGithubUserRepos(
	init?: RequestInit,
): Promise<GithubRepoSummary[]> {
	const username = usernameFromGithubProfileUrl(GITHUB_PROFILE_URL);
	return username ? fetchGithubUserRepos(username, init) : [];
}

export type GithubPublicEventSummary = {
	type: string;
	name: string;
	created_at: string;
};

type GithubPublicEvent = {
	id: string;
	type: string;
	actor: Record<string, unknown>;
	repo: { id: number; name: string; url: string };
	payload: Record<string, unknown>;
	public: boolean;
	created_at: string;
};

function githubUserEventsApiUrl(
	username: string,
	page: number,
	perPage: number = GITHUB_USER_EVENTS_PER_PAGE_MAX,
): string {
	const u = encodeURIComponent(username);
	const p = Math.max(1, Math.floor(page));
	const n = Math.min(
		GITHUB_USER_EVENTS_PER_PAGE_MAX,
		Math.max(1, Math.floor(perPage)),
	);
	return `${GITHUB_API_BASE}/users/${u}/events?page=${p}&per_page=${n}`;
}

function isGithubPublicEvent(x: unknown): x is GithubPublicEvent {
	if (typeof x !== 'object' || x === null) return false;
	const o = x as Record<string, unknown>;
	const repo = o.repo;
	if (typeof repo !== 'object' || repo === null) return false;
	const r = repo as Record<string, unknown>;
	return (
		typeof o.id === 'string' &&
		typeof o.type === 'string' &&
		typeof o.created_at === 'string' &&
		typeof o.public === 'boolean' &&
		typeof o.actor === 'object' &&
		o.actor !== null &&
		typeof o.payload === 'object' &&
		o.payload !== null &&
		typeof r.id === 'number' &&
		typeof r.name === 'string' &&
		typeof r.url === 'string'
	);
}

async function fetchGithubJsonArrayEvents(
	url: string,
	init?: RequestInit,
): Promise<unknown[]> {
	const res = await fetch(url, githubFetchInitEvents(init));
	if (!res.ok) return [];
	const json: unknown = await res.json();
	return Array.isArray(json) ? json : [];
}

async function fetchGithubUserEventsPage(
	username: string,
	page: number,
	init?: RequestInit,
	perPage: number = GITHUB_USER_EVENTS_PER_PAGE_MAX,
): Promise<GithubPublicEvent[]> {
	const raw = await fetchGithubJsonArrayEvents(
		githubUserEventsApiUrl(username, page, perPage),
		init,
	);
	return raw.filter(isGithubPublicEvent);
}

/**
 * 拉取用户收到的公开事件摘要（分页直到某一页为空）。
 *
 * 注意：GitHub `GET /users/{username}/events` 只提供**最近一段时间内**的公开事件（数量有上限），
 * 不能当作完整历史。需要跨年/全年贡献展示时应使用 GraphQL contributions 等接口。
 */
export async function fetchSiteGithubUserEventSummariesAll(
	init?: RequestInit,
): Promise<GithubPublicEventSummary[]> {
	const username = usernameFromGithubProfileUrl(GITHUB_PROFILE_URL);
	if (!username) return [];

	const merged: GithubPublicEventSummary[] = [];
	for (let page = 1; ; page++) {
		const batch = await fetchGithubUserEventsPage(username, page, init);
		if (batch.length === 0) break;
		for (const e of batch) {
			merged.push({
				type: e.type,
				name: e.repo.name,
				created_at: e.created_at,
			});
		}
	}
	return merged;
}
