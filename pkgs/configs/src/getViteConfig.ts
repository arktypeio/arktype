import { join } from "path"
import { builtinModules } from "module"
import merge from "deepmerge"
import { UserConfig, Terser } from "vite"
import reactRefreshPlugin from "@vitejs/plugin-react-refresh"
import commonJsExternalsPlugin from "vite-plugin-commonjs-externals"

const isDev = () => process.env.NODE_ENV === "development"

const externals = [
    "electron",
    "electron-updater",
    "electron-redux",
    "playwright",
    "fs-extra",
    ...builtinModules
]

const materialUiResolves = [
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
    }
]

const terserOptions: Terser.MinifyOptions = {
    ecma: 2020,
    compress: {
        passes: 2
    },
    safari10: false
}

const getBaseConfig = (): UserConfig => ({
    mode: isDev() ? "development" : "production",
    resolve: {
        alias: [...materialUiResolves]
    },
    build: {
        sourcemap: "inline",
        minify: isDev() ? false : "terser",
        terserOptions,
        rollupOptions: {
            external: externals,
            output: {
                entryFileNames: "[name].js"
            }
        },
        emptyOutDir: true
    },
    plugins: [commonJsExternalsPlugin({ externals })]
})

export type GetConfigArgs = {
    srcDir: string
    outDir: string
    watch?: boolean
    options?: UserConfig
}

export const getNodeConfig = ({
    srcDir,
    outDir,
    watch,
    options = {}
}: GetConfigArgs) => {
    const baseNodeConfig = merge<UserConfig>(getBaseConfig(), {
        root: srcDir,
        build: {
            target: "node14",
            outDir,
            lib: {
                entry: join(srcDir, "index.ts"),
                formats: ["cjs"]
            },
            watch: watch ? {} : undefined
        }
    })
    return merge<UserConfig>(baseNodeConfig, options)
}

export const getWebConfig = ({
    srcDir,
    outDir,
    watch,
    options = {}
}: GetConfigArgs) => {
    const baseWebConfig = merge<UserConfig>(getBaseConfig(), {
        root: srcDir,
        build: {
            target: "chrome89",
            polyfillDynamicImport: false,
            outDir,
            watch: watch ? {} : undefined
        },
        plugins: [reactRefreshPlugin()]
    })
    return merge<UserConfig>(baseWebConfig, options)
}
