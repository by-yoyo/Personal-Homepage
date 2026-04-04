'use client';

import {
	createContext,
	useContext,
	useState,
	useCallback,
	useEffect,
	type ReactNode,
} from 'react';
import type { GithubRepoSummary, GithubRepoEvent } from '@/lib/github';
import { fetchGithubRepoEvents } from '@/lib/github';
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
	eventsTitle: string;
	noEvents: string;
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
	const [events, setEvents] = useState<GithubRepoEvent[]>([]);

	const openRepoModal = useCallback((repo: GithubRepoSummary) => {
		setSelectedRepo(repo);
		setIsOpen(true);
		setEvents([]);
	}, []);

	const closeRepoModal = useCallback(() => {
		setIsOpen(false);
		setTimeout(() => {
			setSelectedRepo(null);
			setEvents([]);
		}, 200);
	}, []);

	// Fetch events when repo is selected
	useEffect(() => {
		if (!selectedRepo) return;

		const parts = selectedRepo.full_name.split('/');
		if (parts.length !== 2) return;

		const [owner, repo] = parts;
		let cancelled = false;

		fetchGithubRepoEvents(owner, repo).then((data) => {
			if (!cancelled) setEvents(data);
		});

		return () => {
			cancelled = true;
		};
	}, [selectedRepo]);

	return (
		<RepoModalContext.Provider
			value={{ openRepoModal, closeRepoModal, selectedRepo, isOpen }}>
			{children}
			{isOpen && selectedRepo && (
				<RepoDetailModal
					repo={selectedRepo}
					events={events}
					locale={locale}
					labels={labels}
					onClose={closeRepoModal}
				/>
			)}
		</RepoModalContext.Provider>
	);
}
