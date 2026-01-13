/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enable experimental features if needed
  experimental: {
    // serverActions: true,
  },
  
  // 解決 wagmi/MetaMask SDK/WalletConnect 的模組相容性問題
  webpack: (config) => {
    // 忽略這些在瀏覽器環境中不需要的模組
    config.resolve.fallback = {
      ...config.resolve.fallback,
      // React Native 相關 (MetaMask SDK)
      '@react-native-async-storage/async-storage': false,
      // Node.js 相關 (WalletConnect/pino)
      'pino-pretty': false,
      'lokijs': false,
      'encoding': false,
    };
    
    // 將這些模組標記為外部模組，避免警告
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    
    return config;
  },
}

module.exports = nextConfig
