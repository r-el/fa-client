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
          changeOrigin: true
        },
        '/auth': {
          target: 'http://localhost:12113',
          changeOrigin: true
        },
        '/events': {
          target: 'http://localhost:12113',
          changeOrigin: true
        },
        '/cameras': {
          target: 'http://localhost:12113',
          changeOrigin: true
        },
        '/users': {
          target: 'http://localhost:12113',
          changeOrigin: true
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
      sourcemap: true,
      
      // Minimize bundle size
      minify: 'esbuild', // Use esbuild instead of terser for better compatibility
      
      // Optimize chunk splitting for better caching
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor chunk for React and related libraries
            vendor: ['react', 'react-dom', 'react-router-dom'],
            
            // Services chunk for API calls
            services: ['./src/services/api.tsx', './src/services/authService.tsx']
          }
        }
      }
    },
    
    define: {
      __API_URL__: JSON.stringify(mode === 'production' ? 'https://api.facealert.live' : 'http://localhost:12113'),
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
