import "dotenv"
import { join } from "path"
import { builtinModules } from "module"
import { defineConfig } from "vite"

const PACKAGE_ROOT = __dirname
/**
 * @see https://vitejs.dev/config/
 */
export default defineConfig({
    root: PACKAGE_ROOT,
    resolve: {
        alias: {
            "/@/": join(PACKAGE_ROOT, "src") + "/"
        }
    },
    build: {
        sourcemap: "inline",
        target: `node14`,
        outDir: "dist",
        assetsDir: ".",
        minify: process.env.MODE === "development" ? false : "terser",
        terserOptions: {
            ecma: 2020,
            compress: {
                passes: 2
            },
            safari10: false
        },
        lib: {
            entry: "src/index.ts",
            formats: ["cjs"]
        },
        rollupOptions: {
            external: ["electron", "electron-updater", ...builtinModules],
            output: {
                entryFileNames: "[name].cjs"
            }
        },
        emptyOutDir: true
    }
})
