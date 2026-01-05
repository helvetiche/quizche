import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack configuration for Next.js 16
  turbopack: {},
  
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

export default nextConfig;
