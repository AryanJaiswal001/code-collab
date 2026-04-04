import type { NextConfig } from "next";

const crossOriginIsolationHeaders = [
  {
    key: "Cross-Origin-Embedder-Policy",
    value: "credentialless",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
];

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["@base-ui/react", "@hugeicons/react", "radix-ui"],
  },
  serverExternalPackages: [
    "@auth/core",
    "@auth/prisma-adapter",
    "next-auth",
    "nodemailer",
    "socket.io",
  ],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: crossOriginIsolationHeaders,
      },
    ];
  },
};

export default nextConfig;
