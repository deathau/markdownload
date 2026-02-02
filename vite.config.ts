import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const isFirefox = mode === 'firefox';

  return {
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    build: {
      outDir: isFirefox ? 'dist/firefox' : 'dist/chrome',
      sourcemap: mode === 'development',
      minify: mode !== 'development',
      emptyOutDir: true,
      rollupOptions: {
        input: {
          'service-worker': resolve(__dirname, 'src/service-worker.ts'),
          'content-scripts/content-script': resolve(__dirname, 'src/content-scripts/content-script.ts'),
          'content-scripts/page-context': resolve(__dirname, 'src/content-scripts/page-context.ts'),
          'popup/popup': resolve(__dirname, 'src/popup/popup.ts'),
          'options/options': resolve(__dirname, 'src/options/options.ts'),
        },
        output: {
          entryFileNames: '[name].js',
          chunkFileNames: 'chunks/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
    },
  };
});
