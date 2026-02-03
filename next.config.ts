import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

type WebpackConfig = {
  resolve?: {
    alias?: Record<string, unknown>;
  };
  externals?: unknown[];
};

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
}) as (config: NextConfig) => NextConfig;

const nextConfig: NextConfig = {
  // Turbopack config
  turbopack: {},

  // Image domains (strict typing)
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.ibb.co" },
      { protocol: "https", hostname: "**.ibb.co" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },

  // Security headers
  headers() {
    return Promise.resolve([
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
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
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value:
              "geolocation=(), microphone=(), camera=(), payment=(), usb=()",
          },
        ],
      },
    ]);
  },

  // Webpack tweaks
  webpack: (config: unknown, { isServer }) => {
    const webpackConfig = config as WebpackConfig;
    if (isServer) {
      // Remove canvas from server build
      if (webpackConfig.resolve?.alias) {
        webpackConfig.resolve.alias = {
          ...webpackConfig.resolve.alias,
          canvas: false,
        };
      }

      if (Array.isArray(webpackConfig.externals)) {
        webpackConfig.externals = [...webpackConfig.externals, "canvas"];
      }
    }
    return webpackConfig;
  },
};

export default withBundleAnalyzer(nextConfig);
