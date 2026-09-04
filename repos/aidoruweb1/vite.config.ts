// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { fileURLToPath } from "node:url";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// The mongodb driver pulls in whatwg-url -> tr46, whose `require("punycode/")`
// cannot be bundled for the Worker runtime. Swap tr46 for an ASCII-only shim.
const tr46Shim = fileURLToPath(new URL("./src/lib/tr46-shim.cjs", import.meta.url));

export default defineConfig({
  // Render starts .output/server/index.mjs with Node, so pin Nitro to the
  // Node server preset instead of auto-selecting the Cloudflare worker target.
  nitro: { preset: "node-server" },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    preview: {
      allowedHosts: [
        "aidoruweb1.onrender.com",
        ".onrender.com"
      ]
    },
    resolve: {
      alias: [{ find: /^tr46$/, replacement: tr46Shim }],
    },
  },
});
