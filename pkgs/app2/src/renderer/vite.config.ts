import "dotenv"
import { join } from "path"
import { builtinModules } from "module"
import { defineConfig } from "vite"
import reactRefresh from "@vitejs/plugin-react-refresh"

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
    plugins: [reactRefresh()],
    base: "",
    build: {
        sourcemap: true,
        target: `chrome89`,
        polyfillDynamicImport: false,
        outDir: "dist",
        assetsDir: ".",
        terserOptions: {
            ecma: 2020,
            compress: {
                passes: 2
            },
            safari10: false
        },
        rollupOptions: {
            external: [...builtinModules]
        },
        emptyOutDir: true
    }
})
