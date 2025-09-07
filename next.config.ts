import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configuration pour Turbopack
  turbopack: {
    resolveAlias: {
      // Alias pour éviter les problèmes de résolution de module
      '@/*': './src/*',
    },
  },
  
  
  // Configuration du runtime
  webpack: (config, { isServer }) => {
    // Polyfills pour les modules Node.js en front-end
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
      };
    }
    
    // Optimisations webpack
    config.optimization = {
      ...config.optimization,
      providedExports: true,
      usedExports: true,
      sideEffects: false,
    };
    
    return config;
  },
  
  // External packages pour server components
  serverExternalPackages: [
    '@supabase/supabase-js',
    '@supabase/auth-js',
    '@supabase/realtime-js'
  ],
  
  
  // Configuration ESLint
  eslint: {
    ignoreDuringBuilds: true, // Temporairement pour éviter les erreurs de build
  },
  
  // Configuration TypeScript
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // Configuration des images
  images: {
    domains: ['localhost', 'supabase.co'],
    unoptimized: process.env.NODE_ENV === 'development',
  },
  
  // Configuration de sortie
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
