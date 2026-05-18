import { fileURLToPath, URL } from "node:url";
import fs from "node:fs";
import path from "node:path";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueJsx from "@vitejs/plugin-vue-jsx";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    {
      name: "serve-aui-plugins",
      configureServer(server) {
        const pluginsDir = path.resolve(__dirname, "..", ".whales/aui-plugins");
        server.middlewares.use("/aui-plugins/", (req, res, next) => {
          const relative = req.url!.replace(/^\/aui-plugins\//, "");
          const filePath = path.join(pluginsDir, relative);
          // Prevent directory traversal
          if (!filePath.startsWith(pluginsDir) || !fs.existsSync(filePath)) {
            return next();
          }
          const content = fs.readFileSync(filePath, "utf-8");
          if (filePath.endsWith(".js")) {
            res.setHeader("Content-Type", "application/javascript");
          } else if (filePath.endsWith(".css")) {
            res.setHeader("Content-Type", "text/css");
          }
          res.end(content);
        });
      },
    },
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    proxy: {
      "/api/skills": {
        target: "https://www.modelscope.cn",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/skills/, "/api/v1/dolphin/skills"),
      },
      "/api/mcp": {
        target: "https://www.modelscope.cn",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/mcp/, "/api/v1/dolphin/mcpServers"),
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`,
      },
    },
  },
});
