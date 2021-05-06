import "dotenv"
import { join } from "path"
import { builtinModules } from "module"
import { defineConfig } from "vite"

const PACKAGE_ROOT = join(__dirname, "..")
/**
 * @see https://vitejs.dev/config/
 */
export default defineConfig({
    root: PACKAGE_ROOT,
    resolve: {
        alias: {
            "@/": PACKAGE_ROOT + "/",
            state: join(PACKAGE_ROOT, "state")
        }
    },
    build: {
        sourcemap: "inline",
        target: `node14`,
        outDir: join(PACKAGE_ROOT, "..", "dist"),
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
            entry: "main/index.ts",
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
