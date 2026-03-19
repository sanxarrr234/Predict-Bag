cat > next.config.mjs << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
EOF
Upgrade Next.js di package.json:
sed -i 's/"next": "14.2.0"/"next": "15.2.3"/' package.json
