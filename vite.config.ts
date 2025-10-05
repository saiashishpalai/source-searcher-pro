import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(async () => {
  // Conditionally import component tagger for Lovable deployment
  let componentTaggerPlugin = null;
  try {
    const { componentTagger } = await import("lovable-component-tagger");
    componentTaggerPlugin = componentTagger();
  } catch (error) {
    // Plugin not available in local development, skip it
    console.log("Component tagger not available in local development");
  }

  return {
    server: {
      host: "::",
      port: 8080,
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
    plugins: [
      react(),
      ...(componentTaggerPlugin ? [componentTaggerPlugin] : [])
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
