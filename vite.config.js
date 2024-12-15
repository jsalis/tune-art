import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    root: "app/client",
    publicDir: "../../public",
    build: {
        outDir: "../../dist",
        rollupOptions: {
            output: {
                manualChunks: {
                    react: ["react-dom"],
                },
            },
        },
    },
    server: {
        proxy: {
            "/api/": {
                target: "http://localhost:9999/.netlify/functions",
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, ""),
            },
        },
    },
    plugins: [
        react({
            babel: {
                plugins: ["babel-plugin-styled-components"],
            },
        }),
    ],
});
