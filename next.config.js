/** @type {import('next').NextConfig} */
const nextConfig = {
	eslint: {
		// Ignore ESLint during production builds to speed up the process
		// Linting will still happen during development via 'npm run lint'
		ignoreDuringBuilds: true,
	},
	// Increase body size limit for Server Actions to handle larger file uploads
	experimental: {
		serverActions: {
			bodySizeLimit: "10mb", // Increased from default 1mb to 4mb
		},
	},
	// Allow cross-origin requests from demo.lushaimedia.in
	allowedDevOrigins: [
		'demo.lushaimedia.in',
	],
};

module.exports = nextConfig;
