import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path' // Você precisa importar o path

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Isso diz ao Vite: "Toda vez que ver @, traduza para a pasta src"
      '@': path.resolve(__dirname, './src'),
    },
  },
})