/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  basePath: '/v0-clock-in-app', // Your repo name
  assetPrefix: '/v0-clock-in-app/',
};

export default nextConfig;
