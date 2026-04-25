/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Resolve TypeScript sources from the shared workspace package directly,
  // avoiding the need for a separate build step in packages/shared.
  transpilePackages: ["@wadl/shared"],
};

export default nextConfig;
