const GITHUB_API_BASE = "https://api.github.com";

/** 本站 GitHub 个人主页 */
export const GITHUB_PROFILE_URL = "https://github.com/by-yoyo" as const;

/**
 * 从 GitHub 个人主页 URL 解析用户名，例如 `https://github.com/by-yoyo` → `by-yoyo`。
 * 也支持带子路径的链接（取第一段为用户名）。
 */
export function usernameFromGithubProfileUrl(profileUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(profileUrl.trim());
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  if (host !== "github.com" && host !== "www.github.com") {
    return null;
  }
  const first = url.pathname.split("/").filter(Boolean)[0];
  if (!first) return null;
  // GitHub 用户名：字母数字与单段连字符，长度 1–39
  if (!/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(first)) {
    return null;
  }
  return first;
}

/** `GET /users/{username}` 响应中我们使用的公开字段（见 [Users API](https://docs.github.com/en/rest/users/users#get-a-user)） */
export type GithubUserProfile = {
  avatar_url: string;
  name: string | null;
  blog: string | null;
  location: string | null;
  bio: string | null;
  public_repos: number;
  followers: number;
  created_at: string;
  updated_at: string;
};

function pickGithubUserProfile(data: unknown): GithubUserProfile | null {
  if (typeof data !== "object" || data === null) return null;
  const o = data as Record<string, unknown>;
  return {
    avatar_url: typeof o.avatar_url === "string" ? o.avatar_url : "",
    name: o.name === null || o.name === undefined ? null : String(o.name),
    blog: o.blog === null || o.blog === undefined ? null : String(o.blog),
    location: o.location === null || o.location === undefined ? null : String(o.location),
    bio: o.bio === null || o.bio === undefined ? null : String(o.bio),
    public_repos: typeof o.public_repos === "number" ? o.public_repos : Number(o.public_repos ?? 0),
    followers: typeof o.followers === "number" ? o.followers : Number(o.followers ?? 0),
    created_at: typeof o.created_at === "string" ? o.created_at : "",
    updated_at: typeof o.updated_at === "string" ? o.updated_at : "",
  };
}

/** 请求 `https://api.github.com/users/{username}` 并解析为 {@link GithubUserProfile}；失败时返回 `null`。 */
export async function fetchGithubUserProfile(
  username: string,
  init?: RequestInit,
): Promise<GithubUserProfile | null> {
  const res = await fetch(githubUserApiUrl(username), {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      ...init?.headers,
    },
  });
  if (!res.ok) return null;
  const json: unknown = await res.json();
  return pickGithubUserProfile(json);
}

/** 使用 {@link GITHUB_PROFILE_URL} 对应的用户获取资料。 */
export async function fetchSiteGithubUserProfile(init?: RequestInit): Promise<GithubUserProfile | null> {
  const username = usernameFromGithubProfileUrl(GITHUB_PROFILE_URL);
  return username ? fetchGithubUserProfile(username, init) : null;
}

/** `https://api.github.com/users/{username}` */
export function githubUserApiUrl(username: string): string {
  return `${GITHUB_API_BASE}/users/${encodeURIComponent(username)}`;
}

/** `GET /users/{username}/repos` 响应中我们使用的仓库字段（见 [List repositories for a user](https://docs.github.com/en/rest/repos/repos#list-repositories-for-a-user)） */
export type GithubRepoLicense = {
  key: string;
  name: string | null;
  spdx_id: string | null;
};

export type GithubRepoSummary = {
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
  if (typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  return {
    key: typeof o.key === "string" ? o.key : "",
    name: o.name === null || o.name === undefined ? null : String(o.name),
    spdx_id: o.spdx_id === null || o.spdx_id === undefined ? null : String(o.spdx_id),
  };
}

function pickTopics(data: unknown): string[] {
  if (!Array.isArray(data)) return [];
  return data.filter((x): x is string => typeof x === "string");
}

function pickGithubRepo(data: unknown): GithubRepoSummary | null {
  if (typeof data !== "object" || data === null) return null;
  const o = data as Record<string, unknown>;
  return {
    name: typeof o.name === "string" ? o.name : "",
    description: o.description === null || o.description === undefined ? null : String(o.description),
    created_at: typeof o.created_at === "string" ? o.created_at : "",
    updated_at: typeof o.updated_at === "string" ? o.updated_at : "",
    pushed_at: typeof o.pushed_at === "string" ? o.pushed_at : "",
    git_url: typeof o.git_url === "string" ? o.git_url : "",
    ssh_url: typeof o.ssh_url === "string" ? o.ssh_url : "",
    clone_url: typeof o.clone_url === "string" ? o.clone_url : "",
    homepage: o.homepage === null || o.homepage === undefined ? null : String(o.homepage),
    stargazers_count:
      typeof o.stargazers_count === "number" ? o.stargazers_count : Number(o.stargazers_count ?? 0),
    watchers_count:
      typeof o.watchers_count === "number" ? o.watchers_count : Number(o.watchers_count ?? 0),
    language: o.language === null || o.language === undefined ? null : String(o.language),
    forks_count: typeof o.forks_count === "number" ? o.forks_count : Number(o.forks_count ?? 0),
    license: pickGithubRepoLicense(o.license),
    topics: pickTopics(o.topics),
    forks: typeof o.forks === "number" ? o.forks : Number(o.forks ?? 0),
    open_issues: typeof o.open_issues === "number" ? o.open_issues : Number(o.open_issues ?? 0),
    watchers: typeof o.watchers === "number" ? o.watchers : Number(o.watchers ?? 0),
  };
}

/** `https://api.github.com/users/{username}/repos?sort=pushed` */
export function githubUserReposApiUrl(username: string): string {
  return `${GITHUB_API_BASE}/users/${encodeURIComponent(username)}/repos?sort=pushed`;
}

/** 请求用户仓库列表并解析为 {@link GithubRepoSummary}[]；失败时返回空数组。 */
export async function fetchGithubUserRepos(
  username: string,
  init?: RequestInit,
): Promise<GithubRepoSummary[]> {
  const res = await fetch(githubUserReposApiUrl(username), {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      ...init?.headers,
    },
  });
  if (!res.ok) return [];
  const json: unknown = await res.json();
  if (!Array.isArray(json)) return [];
  return json.map(pickGithubRepo).filter((r): r is GithubRepoSummary => r !== null);
}

/** 使用 {@link GITHUB_PROFILE_URL} 对应用户拉取仓库列表。 */
export async function fetchSiteGithubUserRepos(init?: RequestInit): Promise<GithubRepoSummary[]> {
  const username = usernameFromGithubProfileUrl(GITHUB_PROFILE_URL);
  return username ? fetchGithubUserRepos(username, init) : [];
}

/** 从个人主页 URL 直接得到用户 API 地址；解析失败返回 `null`。 */
export function githubUserApiUrlFromProfileUrl(profileUrl: string): string | null {
  const username = usernameFromGithubProfileUrl(profileUrl);
  return username ? githubUserApiUrl(username) : null;
}

/** 从个人主页 URL 直接得到仓库列表 API 地址；解析失败返回 `null`。 */
export function githubUserReposApiUrlFromProfileUrl(profileUrl: string): string | null {
  const username = usernameFromGithubProfileUrl(profileUrl);
  return username ? githubUserReposApiUrl(username) : null;
}
