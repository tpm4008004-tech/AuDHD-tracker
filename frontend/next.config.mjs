import withPWAInit from 'next-pwa';

const withPWA = withPWAInit({
  customWorkerDir: 'worker',
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

export default withPWA(nextConfig);
