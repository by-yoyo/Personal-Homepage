'use server';

import { fetchGithubRepoLanguages } from '@/lib/github';

export async function getRepoLanguagesForRepo(
	owner: string,
	repo: string,
): Promise<Record<string, number>> {
	return fetchGithubRepoLanguages(owner, repo);
}
