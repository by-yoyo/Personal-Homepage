import Image from 'next/image';

import { getDictionary, type Locale } from '@/dictionaries';
import { fetchSiteGithubUserProfile } from '@/lib/github';
import styles from './page.module.css';

function formatJoinedAt(iso: string, locale: Locale): string {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	return d.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});
}

function blogHref(blog: string | null): string | null {
	if (!blog?.trim()) return null;
	const t = blog.trim();
	if (/^https?:\/\//i.test(t)) return t;
	return `https://${t}`;
}

async function fetchHitokotoText(): Promise<string | null> {
	try {
		const res = await fetch('https://v1.hitokoto.cn/', { cache: 'no-store' });
		if (!res.ok) return null;
		const data: unknown = await res.json();
		if (typeof data !== 'object' || data === null) return null;
		const h = (data as Record<string, unknown>).hitokoto;
		return typeof h === 'string' && h.length > 0 ? h : null;
	} catch {
		return null;
	}
}

export default async function LeftTopCard({ locale }: { locale: Locale }) {
	const [githubUser, hitokoto, dictionary] = await Promise.all([
		fetchSiteGithubUserProfile(),
		fetchHitokotoText(),
		getDictionary(locale),
	]);

	if (!githubUser) {
		return (
			<div className={styles.box}>
				<p className={styles.empty}>无法加载 GitHub 资料</p>
			</div>
		);
	}

	const {
		avatar_url,
		name,
		blog,
		location,
		bio,
		public_repos,
		followers,
		total_stargazers,
		languages_ranked,
		created_at,
	} = githubUser;
	const href = blogHref(blog);

	return (
		<div className={styles.box}>
			<div className={styles.head}>
				{avatar_url ? (
					<Image
						className={styles.avatar}
						src={avatar_url}
						alt=''
						width={100}
						height={100}
						priority
					/>
				) : (
					<div
						className={styles.avatarPlaceholder}
						aria-hidden
					/>
				)}
				<div className={styles.identity}>
					<div className={styles.segmentRow}>
						<div className={styles.nameRow}>
							<h2 className={styles.name}>{name ?? '—'}</h2>
							{location && <p className={styles.meta}>{location}</p>}
						</div>
					</div>
					<div className={styles.segmentRow}>
						{href ? (
							<a
								className={styles.link}
								href={href}
								target='_blank'
								rel='noopener noreferrer'>
								{blog!.trim()}
							</a>
						) : (
							<span className={styles.segmentPlaceholder} />
						)}
					</div>
					<div className={styles.segmentRow}>
						{created_at ? (
							<p className={styles.joined}>
								{locale === 'zh' ? '加入于 ' : 'Joined '}
								<time dateTime={created_at}>
									{formatJoinedAt(created_at, locale)}
								</time>
							</p>
						) : (
							<span className={styles.segmentPlaceholder} />
						)}
					</div>
					<div className={styles.segmentRow}>
						{hitokoto ? (
							<p className={styles.hitokoto}>{hitokoto}</p>
						) : (
							<span
								className={styles.segmentPlaceholder}
								aria-hidden
							/>
						)}
					</div>
				</div>
			</div>

			<div className={styles.tail}>
				<p className={styles.bio}>
					{bio?.trim()
						? bio
						: dictionary.profile.bioEmptyFallback}
				</p>
				{languages_ranked.length > 0 && (
					<p className={styles.languages}>
						{dictionary.profile.languagesRankedIntro}
						{languages_ranked.join(' · ')}
					</p>
				)}
				<dl className={styles.stats}>
					<div className={styles.stat}>
						<dt className={styles.statLabel}>仓库</dt>
						<dd className={styles.statValue}>{public_repos}</dd>
					</div>
					<div className={styles.stat}>
						<dt className={styles.statLabel}>星标</dt>
						<dd className={styles.statValue}>{total_stargazers}</dd>
					</div>
					<div className={styles.stat}>
						<dt className={styles.statLabel}>粉丝</dt>
						<dd className={styles.statValue}>{followers}</dd>
					</div>
				</dl>
			</div>
		</div>
	);
}
