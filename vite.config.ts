import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"

// https://vite.dev/config/
export default defineConfig(({ mode }) => {  
  return {
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    plugins: [react()],
    assetsInclude: ['**/*.svg'],
    
    // Use different HTML files for dev and production
    ...(mode === 'development' && {
      define: {
        __DEV_MODE__: true
      }
    }),
    
    server: {
      port: 5173,
      host: true,
      proxy: {
        '/api': {
          target: 'http://localhost:12113',
          changeOrigin: true,
          // Live video relays over WebSockets under /api too.
          ws: true
        },
        '/socket.io': {
          target: 'http://localhost:12113',
          ws: true
        }
      }
    },
    
    preview: {
      allowedHosts: true
    },
    
    build: {
      assetsDir: 'assets',
      copyPublicDir: true,

      // SEO and Performance Optimizations
      sourcemap: mode === 'development',

      // Minimize bundle size
      minify: 'esbuild',

      // Optimize chunk splitting for better caching
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Vendor chunk for React and related libraries
            if (id.includes('node_modules')) {
              // React core
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
                return 'vendor-react';
              }
              // UI libraries
              if (id.includes('@radix-ui') || id.includes('lucide-react')) {
                return 'vendor-ui';
              }
              // Charts
              if (id.includes('recharts')) {
                return 'vendor-charts';
              }
              // Animation
              if (id.includes('framer-motion')) {
                return 'vendor-motion';
              }
              // Realtime
              if (id.includes('socket.io')) {
                return 'vendor-realtime';
              }
              // Data fetching
              if (id.includes('@tanstack/react-query')) {
                return 'vendor-query';
              }
              // Other vendors
              return 'vendor';
            }
          }
        }
      }
    },
    
    define: {
      __API_URL__: JSON.stringify(mode === 'production' ? 'https://api.specter.live' : 'http://localhost:12113'),
      __APP_VERSION__: JSON.stringify('1.0.0'),
      __BUILD_DATE__: JSON.stringify(new Date().toISOString())
    },
    
    // Optimize dependencies for better performance
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom'],
      exclude: ['@vite/client', '@vite/env']
    }
  };
});
