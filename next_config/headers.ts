type HeaderRule = {
	source: string;
	headers: { key: string; value: string }[];
};

export function getHeaders(): HeaderRule[] {
	return [
		{
			source: '/:path*.(png|jpg|jpeg|ico)',
			headers: [
				{
					key: 'Cache-Control',
					value: 'public, max-age=86400, immutable',
				},
			],
		},
	];
}
