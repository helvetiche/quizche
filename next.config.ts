import type { NextConfig } from "next";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  // Turbopack configuration for Next.js 16
  turbopack: {},
  
  // Image configuration for imgbb
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.ibb.co",
      },
      {
        protocol: "https",
        hostname: "**.ibb.co",
      },
    ],
  },
  
  // Webpack config for non-Turbopack builds (fallback)
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Handle pdfjs-dist worker file for server-side rendering
      config.resolve.alias = {
        ...config.resolve.alias,
        canvas: false,
      };
      
      // Exclude canvas from server bundle
      config.externals = [...(config.externals || []), "canvas"];
    }
    
    return config;
  },
};

export default withBundleAnalyzer(nextConfig);
