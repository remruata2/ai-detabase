import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configure compiler options
  compiler: {
    // Enable styled-components support
    styledComponents: true,
  },
  // Server external packages (moved from experimental)
  serverExternalPackages: ["mammoth", "xlsx"],
  // Experimental features
  experimental: {
    serverActions: {
      // Increase body size limit to 50MB for file uploads
      bodySizeLimit: "50mb",
    },
  },
  // Allow cross-origin requests from demo.lushaimedia.in
  allowedDevOrigins: ["demo.lushaimedia.in"],
};

export default nextConfig;
