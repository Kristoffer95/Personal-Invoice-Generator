import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Resolve workspace packages to their built outputs or dist
      '@invoice-generator/shared-types': path.resolve(__dirname, '../../packages/shared-types'),
      '@invoice-generator/pdf-generator': path.resolve(__dirname, '../../packages/pdf-generator'),
      // Ensure zod resolves from the root node_modules
      'zod': path.resolve(__dirname, './node_modules/zod'),
    },
  },
})
