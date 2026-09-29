import { fileURLToPath, URL } from "node:url"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    tsconfigPaths: true,
    // `tsconfigPaths` is only understood by the top-level Vite. Vitest resolves
    // through its own bundled Vite, which predates that option and would
    // otherwise ignore the `@/*` alias — so state it explicitly for both.
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
})