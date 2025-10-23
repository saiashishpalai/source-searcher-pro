import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const isDev = command === 'serve';
  const isProduction = mode === 'production';
  
  const config: any = {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };

  // Only add dev server config in development
  if (isDev) {
    const keyPath = path.resolve(__dirname, 'localhost-key.pem');
    const certPath = path.resolve(__dirname, 'localhost.pem');
    
    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
      config.server = {
        host: "::",
        port: 8081,
        https: {
          key: fs.readFileSync(keyPath),
          cert: fs.readFileSync(certPath),
        },
        proxy: {
          '/api': {
            target: 'https://localhost:3000',
            changeOrigin: true,
            secure: false,
          },
        },
      };
    } else {
      config.server = {
        host: "::",
        port: 8081,
        proxy: {
          '/api': {
            target: 'http://localhost:3000',
            changeOrigin: true,
          },
        },
      };
    }
  }

  return config;
});
