import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  define: {
    "process.env": {}
  },
  server: {
    proxy: {
      "/api/agent": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/agent/, "")
      }
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        payment: resolve(__dirname, "payment.html")
      }
    }
  },
  optimizeDeps: {
    force: true,
    esbuildOptions: {
      define: {
        "process.env": "{}"
      }
    }
  }
});
