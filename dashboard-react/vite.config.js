import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Pin to IPv4 loopback explicitly. Without this, Vite binds to
    // whatever "localhost" resolves to — on this machine that's the IPv6
    // AAAA record (::1) — while uvicorn's default --host is always the
    // literal IPv4 127.0.0.1. That split can make the browser's Happy
    // Eyeballs fallback do extra work (or misbehave) on every fetch to
    // the backend. Keeping both sides on 127.0.0.1 removes the ambiguity.
    host: '127.0.0.1',
    // If 5173 is already taken, Vite's default behavior is to silently pick
    // the next free port (5174, 5175, ...) instead of erroring. That's what
    // actually broke CORS here: a second `npm run dev` landed on 5174,
    // which was never in the backend's allow_origins list, and the browser
    // silently blocked every request with no obvious cause. Fail loudly
    // instead — if this throws EADDRINUSE, that means a duplicate dev
    // server is already running; stop it rather than let a second one drift
    // onto an unlisted port.
    strictPort: true,
    port: 5173,
  },
})
