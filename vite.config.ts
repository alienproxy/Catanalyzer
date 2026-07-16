import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Emit relative asset URLs (./assets/...) so the built site works no matter
  // what folder it's served from — domain root, subdomain, or a subdirectory.
  base: './',
  plugins: [react()],
  // react-draggable 4.7.0 reads `process.env.DRAGGABLE_DEBUG` inside its drag
  // handlers. `process` doesn't exist in the browser, so without this the very
  // first mousedown on a drag handle throws "process is not defined" and the
  // drag silently aborts. Resolve the reference so it short-circuits to false.
  define: {
    'process.env.DRAGGABLE_DEBUG': 'false',
  },
})
