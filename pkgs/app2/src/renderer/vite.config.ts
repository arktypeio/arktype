import "dotenv"
import { join } from "path"
import { builtinModules } from "module"
import { defineConfig } from "vite"
import reactRefresh from "@vitejs/plugin-react-refresh"

const PACKAGE_ROOT = join(__dirname, "..")

/**
 * @see https://vitejs.dev/config/
 */
export default defineConfig({
    root: PACKAGE_ROOT,
    resolve: {
        alias: {
            "@/": PACKAGE_ROOT + "/",
            state: join(PACKAGE_ROOT, "state"),
            renderer: join(PACKAGE_ROOT, "renderer")
        }
    },
    plugins: [reactRefresh()],
    base: "",
    build: {
        sourcemap: true,
        target: `chrome89`,
        polyfillDynamicImport: false,
        outDir: join(PACKAGE_ROOT, "..", "dist", "renderer"),
        assetsDir: ".",
        lib: {
            entry: "renderer/index.html",
            formats: ["cjs"]
        },
        terserOptions: {
            ecma: 2020,
            compress: {
                passes: 2
            },
            safari10: false
        },
        rollupOptions: {
            external: [...builtinModules],
            output: {
                entryFileNames: "[name].cjs"
            }
        },
        emptyOutDir: true
    }
})
