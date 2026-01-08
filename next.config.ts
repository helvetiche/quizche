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
  
  // Security headers for all pages (CSP allows Firebase OAuth)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; " +
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.googleapis.com https://apis.google.com https://*.gstatic.com https://*.firebaseapp.com https://www.gstatic.com; " +
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
              "img-src 'self' data: https: blob:; " +
              "font-src 'self' data: https://fonts.gstatic.com; " +
              "connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://*.google.com https://*.ibb.co https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://accounts.google.com wss://*.firebaseio.com; " +
              "frame-src 'self' https://*.google.com https://*.googleapis.com https://accounts.google.com https://*.firebaseapp.com; " +
              "frame-ancestors 'none'; " +
              "object-src 'none'; " +
              "base-uri 'self';",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "geolocation=(), microphone=(), camera=(), payment=(), usb=()",
          },
        ],
      },
    ];
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
