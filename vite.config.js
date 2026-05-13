import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  
  // Development server with security headers
  server: {
    headers: {
      // Prevent browsers from guessing the MIME type (XSS protection)
      'X-Content-Type-Options': 'nosniff',
      
      // Prevent page from being embedded in iframes (Clickjacking protection)
      'X-Frame-Options': 'DENY',
      
      // Enable XSS filter in older browsers
      'X-XSS-Protection': '1; mode=block',
      
      // Control referrer information sent to other sites
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      
      // Prevent browsers from caching sensitive content
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      
      // Enable stricter standards mode
      'X-UA-Compatible': 'IE=edge',
    },
  },

  // Production build security configuration
  build: {
    // Generate source maps for debugging but don't expose sensitive code
    sourcemap: false,
    
    // Minify code to reduce attack surface
    minify: 'terser',
    
    // Check for potential security issues
    rollupOptions: {
      output: {
        // Use strict mode
        strict: true,
      },
    },
  },
})
