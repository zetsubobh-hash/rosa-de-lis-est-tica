import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      selfDestroying: true,
      injectRegister: false,
      includeAssets: ["favicon.ico", "robots.txt"],
      workbox: {
        navigateFallbackDenylist: [/^\/~oauth/],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,jpg,webp,woff2}"],
      },
      manifest: {
        name: "Rosa de Lis Estética",
        short_name: "Rosa de Lis",
        description: "Realce sua beleza natural com tratamentos personalizados.",
        theme_color: "#E91E63",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        // Ícone FIXO do app (cópia local do ícone oficial). Nunca apontar para o storage:
        // qualquer alteração no arquivo remoto faz o Android regenerar o ícone instalado.
        id: "/",
        scope: "/",
        icons: [
          { src: "/icons/rosadelis-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icons/rosadelis-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icons/rosadelis-icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "/icons/rosadelis-icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
}));
