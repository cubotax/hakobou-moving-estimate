/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,

    // Pages Router configuration
    pageExtensions: ['tsx', 'ts', 'jsx', 'js'],

    // Environment variables (VITE_ prefix for compatibility with existing code)
    env: {
        VITE_API_URL: process.env.VITE_API_URL || 'http://localhost:3001',
        VITE_MAPS_API_KEY: process.env.VITE_MAPS_API_KEY || '',
    },

    // Allow external images from Google Maps
    images: {
        domains: ['maps.googleapis.com', 'maps.gstatic.com'],
    },

    // Transpile packages if needed
    transpilePackages: ['recharts'],
};

module.exports = nextConfig;
