/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@career-pilot/types"],
  async rewrites() {
    const apiOrigin = process.env.API_ORIGIN || "http://127.0.0.1:4000";

    return [
      {
        source: "/api/:path*",
        destination: `${apiOrigin}/v1/:path*`
      }
    ];
  }
};

export default nextConfig;
