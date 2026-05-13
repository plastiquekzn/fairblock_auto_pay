import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  define: {
    "process.env": {}
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
