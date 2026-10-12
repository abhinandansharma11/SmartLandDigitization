import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// In development `npm run dev` forwards API calls to the FastAPI backend on :8000.
// In production FastAPI serves the built `dist/` folder itself, so the API is same-origin.
export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: { proxy: { '/api': 'http://localhost:8000' } },
})
