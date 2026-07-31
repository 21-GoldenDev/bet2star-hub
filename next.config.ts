import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ["pdfkit"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "bet2star-hub.vercel.app",
      },
    ],
  },
  allowedDevOrigins: ["bet2star-hub.vercel.app"],
};

export default nextConfig;
