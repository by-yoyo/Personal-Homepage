'use client';

import {
	createContext,
	useContext,
	useState,
	useCallback,
	type ReactNode,
} from 'react';
import type { GithubRepoSummary } from '@/lib/github';
import type { Locale } from '@/dictionaries';
import { RepoDetailModal } from './repo-detail-modal';

type RepoModalContextType = {
	openRepoModal: (repo: GithubRepoSummary) => void;
	closeRepoModal: () => void;
	selectedRepo: GithubRepoSummary | null;
	isOpen: boolean;
};

const RepoModalContext = createContext<RepoModalContextType | null>(null);

export function useRepoModal() {
	const ctx = useContext(RepoModalContext);
	if (!ctx) {
		throw new Error('useRepoModal must be used within RepoModalProvider');
	}
	return ctx;
}

type RepoModalLabels = {
	modalTitle: string;
	openOnGithub: string;
	noDesc: string;
	created: string;
	updated: string;
	pushed: string;
};

export function RepoModalProvider({
	children,
	locale,
	labels,
}: {
	children: ReactNode;
	locale: Locale;
	labels: RepoModalLabels;
}) {
	const [selectedRepo, setSelectedRepo] = useState<GithubRepoSummary | null>(null);
	const [isOpen, setIsOpen] = useState(false);

	const openRepoModal = useCallback((repo: GithubRepoSummary) => {
		setSelectedRepo(repo);
		setIsOpen(true);
	}, []);

	const closeRepoModal = useCallback(() => {
		setIsOpen(false);
		setTimeout(() => setSelectedRepo(null), 200);
	}, []);

	return (
		<RepoModalContext.Provider
			value={{ openRepoModal, closeRepoModal, selectedRepo, isOpen }}>
			{children}
			{isOpen && selectedRepo && (
				<RepoDetailModal
					repo={selectedRepo}
					locale={locale}
					labels={labels}
					onClose={closeRepoModal}
				/>
			)}
		</RepoModalContext.Provider>
	);
}
