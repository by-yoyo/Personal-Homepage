import { getDictionary, type Locale } from '@/dictionaries';

interface PageProps {
	params: Promise<{ language: Locale }>;
}

export default async function ProfilePage({ params }: PageProps) {
	const { language } = await params;
	const dictionary = await getDictionary(language);

	return (
		<div>
			<p>
				<strong>页面标题:</strong> {dictionary.profile.title}
			</p>
		</div>
	);
}
