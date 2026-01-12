/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    // 型エラーをビルド時に許容（開発中用）
    typescript: {
        ignoreBuildErrors: true,
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
};

export default nextConfig;
