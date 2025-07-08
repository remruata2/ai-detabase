/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Ignore ESLint during production builds to speed up the process
    // Linting will still happen during development via 'npm run lint'
    ignoreDuringBuilds: true,
  },
  // Add other Next.js config options here
};

module.exports = nextConfig;
