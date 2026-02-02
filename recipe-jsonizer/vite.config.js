import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages(project page) 배포용 base
  // 배포 URL: https://glamboy77-tech.github.io/RecipeBook/
  base: '/RecipeBook/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // 개발 중에도 SW를 켜서 테스트할지 여부(기본 false). 일단 false 유지.
      devOptions: { enabled: false },
      includeAssets: ['vite.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'RecipeBook',
        short_name: 'RecipeBook',
        description: '레시피 뷰어 + 변환기',
        theme_color: '#0b0d12',
        background_color: '#0b0d12',
        display: 'standalone',
        scope: '/RecipeBook/',
        start_url: '/RecipeBook/',
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png',
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // “전체 레시피 오프라인” 목적: 빌드 시점에 public/recipes 아래 JSON을 전부 precache
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        globIgnores: ['**/node_modules/**/*'],
        // 이미지 용량이 2MB를 넘어 precache에서 제외되면 build 실패하므로 한도를 상향
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
      },
    }),
  ],
})
