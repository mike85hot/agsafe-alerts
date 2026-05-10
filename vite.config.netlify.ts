// Netlify-only Vite config. Used by Netlify builds via netlify.toml.
// The default vite.config.ts (Cloudflare-based) is left untouched so the
// Lovable preview keeps working.
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import netlify from "@netlify/vite-plugin-tanstack-start";

export default defineConfig({
  plugins: [
    tsConfigPaths(),
    tailwindcss(),
    tanstackStart(),
    react(),
    netlify(),
  ],
});
