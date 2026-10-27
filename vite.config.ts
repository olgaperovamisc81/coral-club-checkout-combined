import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Имя репозитория для адреса на GitHub Pages. В Actions его отдаёт сама
// GitHub (GITHUB_REPOSITORY = «владелец/репозиторий»), поэтому тот же код
// собирается и в основном репозитории, и в отдельном — для показа версии,
// не входящей в тест. Вне Actions остаётся прежнее имя.
const repositoryName =
  process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'coral-club-checkout-prototypes'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // На проде (GitHub Pages) прототип живёт по адресу /<репозиторий>/, а не в
  // корне домена — иначе ассеты не подгрузятся. Локальный dev-сервер при этом
  // не трогаем — там как был корень, так и остаётся.
  base: command === 'build' ? `/${repositoryName}/` : '/',

  // Плавающая кнопка Vue DevTools мешала смотреть макет на реальных
  // устройствах — убрала плагин. При необходимости отладки компонентов
  // можно вернуть vite-plugin-vue-devtools обратно.
  plugins: [vue()],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
        // Токены, брейкпоинты и миксины (mediaMinWidth, paletteColor, ...)
        // доступны во всех <style lang="scss"> без ручного @use.
        additionalData: `@use "@/styles/core" as *;\n`,
      },
    },
  },

  server: {
    // true — слушает на всех сетевых интерфейсах, не только localhost,
    // чтобы стенд был виден с телефона в той же Wi-Fi сети.
    host: true,
    port: 5173,
    strictPort: false,
    open: false,
  },
}))
