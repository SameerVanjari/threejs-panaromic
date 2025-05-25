// vite.config.js
import { defineConfig } from 'vite'

export default defineConfig({
  root: '.', // since your index.html is in the root
  build: {
    outDir: 'dist',
  },
})
