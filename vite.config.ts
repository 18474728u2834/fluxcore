import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import obfuscator from "vite-plugin-javascript-obfuscator";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Primary backend now runs on the owned standby project.
  define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify("https://sixmihcowaoudfqfqhjf.supabase.co"),
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpeG1paGNvd2FvdWRmcWZxaGpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1NTU2MzEsImV4cCI6MjEwMjEzMTYzMX0.ofz82pHB1dO6Ih-2OznQEbWltNbZwaQLaL6DPUyPFtw"),
    "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpeG1paGNvd2FvdWRmcWZxaGpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1NTU2MzEsImV4cCI6MjEwMjEzMTYzMX0.ofz82pHB1dO6Ih-2OznQEbWltNbZwaQLaL6DPUyPFtw"),
    "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify("sixmihcowaoudfqfqhjf"),
  },
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
    mode === "production" && obfuscator({
      include: ["**/assets/*.js"],
      exclude: ["**/*.css", "**/*.html"],
      apply: "build",
      options: {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.5,
        deadCodeInjection: false,
        debugProtection: true,
        debugProtectionInterval: 2000,
        disableConsoleOutput: true,
        identifierNamesGenerator: "mangled-shuffled",
        renameGlobals: false,
        selfDefending: true,
        simplify: true,
        splitStrings: true,
        splitStringsChunkLength: 8,
        stringArray: true,
        stringArrayEncoding: ["base64"],
        stringArrayIndexShift: true,
        stringArrayRotate: true,
        stringArrayShuffle: true,
        stringArrayWrappersCount: 2,
        stringArrayWrappersChainedCalls: true,
        stringArrayWrappersParametersMaxCount: 4,
        stringArrayWrappersType: "function",
        stringArrayThreshold: 0.75,
        transformObjectKeys: false,
        numbersToExpressions: true,
        unicodeEscapeSequence: false,
      },
    }),
  ].filter(Boolean),
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
    chunkSizeWarningLimit: 2000,
    minify: "terser",
    terserOptions: {
      compress: { drop_console: true, drop_debugger: true, passes: 3 },
      mangle: { toplevel: true },
      format: { comments: false },
    },
    rollupOptions: {
      output: {
        // Bundle everything into a single mangled blob — no readable chunk names
        manualChunks: undefined,
        entryFileNames: "assets/[hash].js",
        chunkFileNames: "assets/[hash].js",
        assetFileNames: "assets/[hash][extname]",
      },
    },
  },
}));
