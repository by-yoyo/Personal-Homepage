import type { NextConfig } from 'next';
import { getHeaders } from './next_config/headers';

const nextConfig: NextConfig = {
	transpilePackages: ['three'],
	output: 'standalone',
	reactCompiler: true,
	async headers() {
		if (process.env.NODE_ENV !== 'production') {
			return [];
		}
		return getHeaders();
	},
};

export default nextConfig;
