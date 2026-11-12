import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/**
 * MapLibre 6 resolves its web worker relative to its own module file, which
 * breaks once Vite pre-bundles (dev) or hashes (build) the library. Serve the
 * worker and its shared chunk at a fixed path instead; the app points MapLibre
 * at it with setWorkerUrl() (see src/components/map/worker.ts).
 */
function maplibreWorker(): Plugin {
  const dir = path.resolve('node_modules/maplibre-gl/dist')
  const files = ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']
  const prefix = '/vendor/maplibre/'
  return {
    name: 'pahar:maplibre-worker',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? '').split('?')[0] ?? ''
        const file = url.startsWith(prefix) ? url.slice(prefix.length) : ''
        if (!files.includes(file)) return next()
        res.setHeader('Content-Type', 'text/javascript; charset=utf-8')
        fs.createReadStream(path.join(dir, file)).pipe(res)
      })
    },
    generateBundle() {
      for (const file of files) {
        this.emitFile({ type: 'asset', fileName: `vendor/maplibre/${file}`, source: fs.readFileSync(path.join(dir, file)) })
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), maplibreWorker()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // Relative base so the static build runs from any host or sub-path
  // (GitHub Pages, a USB stick, a laptop at the judging table).
  base: './',
  build: {
    // MapLibre is a single ~1 MB module; it gets its own long-cacheable chunk and the
    // limit sits just above it so any growth in app code still raises a warning.
    chunkSizeWarningLimit: 1100,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [{ name: 'maplibre', test: /node_modules[\\/]maplibre-gl/ }],
        },
      },
    },
  },
  server: {
    host: true,
    port: 5173,
  },
})
