import { join } from "path"
import { builtinModules } from "module"
import { merge } from "@re-do/utils"
import { isDev } from "@re-do/node-utils"
import { UserConfig } from "vite"
import reactRefresh from "@vitejs/plugin-react-refresh"

const sourceRoot = join(__dirname, "src")
const outRoot = join(__dirname, "dist")

const getConfig = (options?: Partial<UserConfig>) =>
    merge<UserConfig>(
        {
            mode: isDev() ? "development" : "production",
            resolve: {
                alias: [
                    {
                        find: /^@material-ui\/icons\/(.*)/,
                        replacement: "@material-ui/icons/esm/$1"
                    },
                    {
                        find: /^@material-ui\/core\/(.+)/,
                        replacement: "@material-ui/core/es/$1"
                    },
                    {
                        find: /^@material-ui\/core$/,
                        replacement: "@material-ui/core/es"
                    },
                    { find: "main", replacement: join(sourceRoot, "main") },
                    {
                        find: "renderer",
                        replacement: join(sourceRoot, "renderer")
                    },
                    { find: "state", replacement: join(sourceRoot, "state") },
                    {
                        find: "observer",
                        replacement: join(sourceRoot, "observer")
                    }
                ]
            },
            build: {
                sourcemap: "inline",
                minify: isDev() ? false : "terser",
                terserOptions: {
                    ecma: 2020,
                    compress: {
                        passes: 2
                    },
                    safari10: false
                },
                assetsDir: ".",
                rollupOptions: {
                    external: [
                        "electron",
                        "electron-updater",
                        "playwright-core",
                        ...builtinModules
                    ],
                    output: {
                        entryFileNames: "[name].js"
                    }
                },
                emptyOutDir: true
            }
        },
        options
    )

export type GetConfigArgs = {
    watch?: boolean
}

export const getMainConfig = ({ watch }: GetConfigArgs = {}) =>
    getConfig({
        root: join(sourceRoot, "main"),
        build: {
            target: "node14",
            outDir: join(outRoot, "main"),
            lib: {
                entry: join(sourceRoot, "main", "index.ts"),
                formats: ["cjs"]
            },
            watch: watch ? {} : undefined
        }
    })

export const getRendererConfig = ({ watch }: GetConfigArgs = {}) =>
    getConfig({
        root: join(sourceRoot, "renderer"),
        build: {
            target: "chrome89",
            polyfillDynamicImport: false,
            outDir: join(outRoot, "renderer"),
            watch: watch ? {} : undefined
        },
        plugins: [reactRefresh()]
    })

export const getObserverConfig = ({ watch }: GetConfigArgs = {}) =>
    getConfig({
        root: join(sourceRoot, "observer"),
        build: {
            target: "chrome89",
            polyfillDynamicImport: false,
            outDir: join(outRoot, "observer"),
            watch: watch ? {} : undefined
        }
    })
