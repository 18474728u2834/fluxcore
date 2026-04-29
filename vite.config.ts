import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  build: {
    target: "es2020",
    cssCodeSplit: true,
    sourcemap: false,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // Split each page into its own opaque chunk so devtools only see
        // the code for the route currently in use, not the whole app.
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            // Per-page chunks
            const pageMatch = id.match(/\/src\/pages\/([^/]+)\.tsx?$/);
            if (pageMatch) return `p-${pageMatch[1].toLowerCase()}`;

            // Per-feature dialog/section chunks
            const featMatch = id.match(/\/src\/features\/([^/]+)\//);
            if (featMatch) return `f-${featMatch[1].toLowerCase()}`;
            return undefined;
          }

          // Vendor splitting — keep heavy libs out of the main bundle
          if (id.includes("react-router")) return "v-router";
          if (id.includes("@tanstack/react-query")) return "v-query";
          if (id.includes("@supabase")) return "v-supabase";
          if (id.includes("@radix-ui")) return "v-radix";
          if (id.includes("lucide-react")) return "v-icons";
          if (id.includes("react-dom")) return "v-react-dom";
          if (id.includes("/react/")) return "v-react";
          if (id.includes("recharts") || id.includes("d3-")) return "v-charts";
          if (id.includes("date-fns")) return "v-date";
          if (id.includes("zod") || id.includes("react-hook-form")) return "v-forms";
          return "v-misc";
        },
        // Opaque, hashed chunk filenames so route names aren't visible in network tab
        chunkFileNames: "assets/[hash].js",
        entryFileNames: "assets/[hash].js",
        assetFileNames: "assets/[hash][extname]",
      },
    },
  },
}));
