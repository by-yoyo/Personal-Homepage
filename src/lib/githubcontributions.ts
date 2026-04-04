import { cache } from 'react';
import { GITHUB_PROFILE_URL, usernameFromGithubProfileUrl } from '@/lib/github';
import type { Locale } from '@/dictionaries';

type ContributionsDay = {
	date: string; // YYYY-MM-DD
	contributionCount: number;
};

type ContributionsCalendar = {
	totalContributions: number;
	weeks: {
		contributionDays: ContributionsDay[];
	}[];
};

type ContributionsCollectionTotals = {
	totalCommitContributions: number;
	totalIssueContributions: number;
	totalPullRequestContributions: number;
	totalPullRequestReviewContributions: number;
};

type ContributionsCollectionRange = ContributionsCollectionTotals & {
	contributionCalendar: ContributionsCalendar;
};

export type GithubContributionsSummary = {
	totalContributionsAllTime: number;
	totalContributionsLastYear: number;
	currentStreak: number;
	longestStreak: number;
	/** 连续日历（近一年，按 UTC 日期）。 */
	calendarDays: { date: string; count: number }[];
	/** 每一年贡献日历（用于点击切换）。 */
	yearCalendars: { year: number; calendarDays: { date: string; count: number }[] }[];
	/** 近几年贡献（按年累计；当前年+前 4 年）。 */
	years: { year: number; count: number }[];
};

const GITHUB_API_GRAPHQL = 'https://api.github.com/graphql';
const GITHUB_FETCH_REVALIDATE_SEC = 3600;

function num(x: unknown): number {
	if (typeof x === 'number') return x;
	const n = Number(x);
	return Number.isFinite(n) ? n : 0;
}

function toISODateUtc(d: Date): string {
	return d.toISOString().slice(0, 10);
}

function dateStrToUtcMidnight(d: string): Date | null {
	const t = Date.parse(`${d}T00:00:00Z`);
	if (Number.isNaN(t)) return null;
	return new Date(t);
}

function computeStreaks(calendarDays: { date: string; count: number }[]) {
	// GitHub streak: 从「今天」往前连续 contributionCount > 0 的天数。
	const sorted = [...calendarDays].sort((a, b) => (a.date < b.date ? -1 : 1));
	if (sorted.length === 0) return { currentStreak: 0, longestStreak: 0 };

	const todayStr = toISODateUtc(new Date());
	let todayIdx = sorted.findIndex((d) => d.date === todayStr);
	if (todayIdx === -1) todayIdx = sorted.length - 1;

	let currentStreak = 0;
	for (let i = todayIdx; i >= 0; i--) {
		if (sorted[i]!.count <= 0) break;
		currentStreak++;
	}

	let longestStreak = 0;
	let run = 0;
	for (let i = 0; i < sorted.length; i++) {
		if (sorted[i]!.count > 0) {
			run++;
			if (run > longestStreak) longestStreak = run;
		} else {
			run = 0;
		}
	}

	return { currentStreak, longestStreak };
}

async function githubGraphqlRequest<TData>(
	query: string,
	variables: Record<string, unknown>,
): Promise<TData> {
	const token = process.env.GITHUB_TOKEN;

	const res = await fetch(GITHUB_API_GRAPHQL, {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			accept: 'application/vnd.github+json',
			...(token ? { authorization: `Bearer ${token}` } : null),
		},
		body: JSON.stringify({ query, variables }),
		next: { revalidate: GITHUB_FETCH_REVALIDATE_SEC },
	});

	if (!res.ok) {
		throw new Error(`GitHub GraphQL failed: ${res.status}`);
	}

	const json: unknown = await res.json();
	const data = (json as { data?: unknown }).data as unknown;
	return data as TData;
}

const QUERY_SUMMARY = /* GraphQL */ `
	query($login: String!) {
		user(login: $login) {
			contributionsCollection {
				totalCommitContributions
				totalIssueContributions
				totalPullRequestContributions
				totalPullRequestReviewContributions
				contributionCalendar {
					totalContributions
					weeks {
						contributionDays {
							date
							contributionCount
						}
					}
				}
			}
		}
	}
`;

const QUERY_YEAR_TOTALS = /* GraphQL */ `
	query($login: String!, $from: DateTime!, $to: DateTime!) {
		user(login: $login) {
			contributionsCollection(from: $from, to: $to) {
				totalCommitContributions
				totalIssueContributions
				totalPullRequestContributions
				totalPullRequestReviewContributions
				contributionCalendar {
					totalContributions
					weeks {
						contributionDays {
							date
							contributionCount
						}
					}
				}
			}
		}
	}
`;

function sumContributionTotals(t: ContributionsCollectionTotals) {
	return (
		num(t.totalCommitContributions) +
		num(t.totalIssueContributions) +
		num(t.totalPullRequestContributions) +
		num(t.totalPullRequestReviewContributions)
	);
}

export const fetchGithubContributionsSummary = cache(
	async function fetchGithubContributionsSummary(
		_locale: Locale,
		options?: { yearsBack?: number },
	): Promise<GithubContributionsSummary | null> {
		const username = usernameFromGithubProfileUrl(GITHUB_PROFILE_URL);
		if (!username) return null;

		const yearsBack = Math.max(1, Math.min(6, options?.yearsBack ?? 4)); // 含当前年：yearsBack+1
		const now = new Date();
		const currentYear = now.getUTCFullYear();

		try {
			const data = await githubGraphqlRequest<{
				user: {
					contributionsCollection: {
						totalCommitContributions: number;
						totalIssueContributions: number;
						totalPullRequestContributions: number;
						totalPullRequestReviewContributions: number;
						contributionCalendar: ContributionsCalendar;
					};
				} | null;
			}>(QUERY_SUMMARY, { login: username });

			const collection = data?.user?.contributionsCollection;
			if (!collection) return null;

			const totalsAllTime = sumContributionTotals(
				collection as unknown as ContributionsCollectionTotals,
			);
			const totalLastYear = num(collection.contributionCalendar.totalContributions);

			const calendarDays: { date: string; count: number }[] = [];
			for (const w of collection.contributionCalendar.weeks) {
				for (const d of w.contributionDays) {
					calendarDays.push({ date: d.date, count: num(d.contributionCount) });
				}
			}

			const { currentStreak, longestStreak } = computeStreaks(calendarDays);

			const yearResults: { year: number; count: number }[] = [];
			const yearCalendars: {
				year: number;
				calendarDays: { date: string; count: number }[];
			}[] = [];
			const yearsToFetch = [];
			for (let i = yearsBack; i >= 0; i--) yearsToFetch.push(currentYear - i);

			for (const y of yearsToFetch) {
				// DateTime: 使用 UTC，to 取「下一年起点」，避免边界问题。
				const from = new Date(Date.UTC(y, 0, 1, 0, 0, 0));
				const to = new Date(Date.UTC(y + 1, 0, 1, 0, 0, 0));

				const yd = await githubGraphqlRequest<{
					user: {
						contributionsCollection: ContributionsCollectionRange;
					} | null;
				}>(QUERY_YEAR_TOTALS, {
					login: username,
					from: from.toISOString(),
					to: to.toISOString(),
				});

				const totals = yd?.user?.contributionsCollection;
				const count = totals ? sumContributionTotals(totals) : 0;
				yearResults.push({ year: y, count });

				const yCalendarDays: { date: string; count: number }[] = [];
				if (totals?.contributionCalendar?.weeks) {
					for (const w of totals.contributionCalendar.weeks) {
						for (const d of w.contributionDays) {
							yCalendarDays.push({ date: d.date, count: num(d.contributionCount) });
						}
					}
				}

				yearCalendars.push({ year: y, calendarDays: yCalendarDays });
			}

			// 按从新到旧展示（更像 GitHub）
			yearResults.sort((a, b) => b.year - a.year);

			return {
				totalContributionsAllTime: totalsAllTime,
				totalContributionsLastYear: totalLastYear,
				currentStreak,
				longestStreak,
				calendarDays,
				yearCalendars,
				years: yearResults,
			};
		} catch (e) {
			// eslint-disable-next-line no-console
			console.warn('[github-contributions]', e);
			return null;
		}
	},
);

