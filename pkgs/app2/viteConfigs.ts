import { join } from "path"
import { builtinModules } from "module"
import { merge } from "@re-do/utils"
import { isDev } from "@re-do/node-utils"
import { UserConfig } from "vite"
import reactRefresh from "@vitejs/plugin-react-refresh"

const root = join(__dirname, "src")
const outRoot = join(__dirname, "dist")

const getConfig = (entry: string, options?: Partial<UserConfig>) =>
    merge<UserConfig>(
        {
            root,
            mode: isDev() ? "development" : "production",
            resolve: {
                alias: {
                    "@/": root + "/",
                    main: join(root, "main"),
                    observer: join(root, "observer"),
                    renderer: join(root, "renderer"),
                    state: join(root, "state")
                }
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
                lib: {
                    entry,
                    formats: ["cjs"]
                },
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

export const getMainConfig = () =>
    getConfig(join(root, "main", "index.ts"), {
        build: {
            target: "node14",
            outDir: join(outRoot, "main")
        }
    })

export const getRendererConfig = () =>
    getConfig(join(root, "renderer", "index.html"), {
        build: {
            target: "chrome89",
            polyfillDynamicImport: false,
            outDir: join(outRoot, "renderer")
        },
        plugins: [reactRefresh()]
    })

export const getObserverConfig = () =>
    getConfig(join(root, "observer", "index.ts"), {
        build: {
            target: "chrome89",
            polyfillDynamicImport: false,
            outDir: join(outRoot, "observer")
        }
    })
