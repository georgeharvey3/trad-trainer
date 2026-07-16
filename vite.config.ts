import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
// BASE_PATH is set to "/trad-trainer/" by the GitHub Pages workflow so assets
// resolve under the project-page subpath; locally it defaults to "/".
export default defineConfig({
  base: process.env.BASE_PATH || "/",
  plugins: [react()],
  server: { port: 5173 },
});
