import { setWorkerUrl } from 'maplibre-gl'

/**
 * Point MapLibre at the worker served by the `pahar:maplibre-worker` Vite plugin.
 * Resolved against the document so it works from any base path.
 */
setWorkerUrl(new URL('vendor/maplibre/maplibre-gl-worker.mjs', document.baseURI).href)
