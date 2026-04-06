import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: './',
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI1': JSON.stringify(env.GEMINI1),
      'process.env.GEMINI2': JSON.stringify(env.GEMINI2),
      'process.env.GEMINI3': JSON.stringify(env.GEMINI3),
      'process.env.GEMINI4': JSON.stringify(env.GEMINI4),
      'process.env.GEMINI5': JSON.stringify(env.GEMINI5),
      'process.env.GEMINI6': JSON.stringify(env.GEMINI6),
      'process.env.GEMINI7': JSON.stringify(env.GEMINI7),
      'process.env.GEMINI8': JSON.stringify(env.GEMINI8),
      'process.env.GEMINI9': JSON.stringify(env.GEMINI9),
      'process.env.GEMINI10': JSON.stringify(env.GEMINI10),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
