import { join } from "path"
import { builtinModules } from "module"
import merge from "deepmerge"
import { UserConfig, Terser, LibraryFormats } from "vite"
import reactRefreshPlugin from "@vitejs/plugin-react-refresh"

const isDev = () => process.env.NODE_ENV === "development"

const externals = [
    "electron",
    "electron-redux",
    "playwright-core",
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
    }
})

export type GetConfigArgs = {
    srcDir: string
    outDir: string
    watch?: boolean
    options?: UserConfig
}

export type GetNodeConfigArgs = GetConfigArgs & {
    formats?: LibraryFormats[]
}

export const getNodeConfig = ({
    srcDir,
    outDir,
    watch,
    options = {},
    formats = ["cjs"]
}: GetNodeConfigArgs) => {
    const baseNodeConfig = merge<UserConfig>(getBaseConfig(), {
        root: srcDir,
        build: {
            target: "node14",
            outDir,
            lib: {
                entry: join(srcDir, "index.ts"),
                formats
            },
            watch: watch ? {} : null
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
            outDir,
            watch: watch ? {} : null
        },
        plugins: [reactRefreshPlugin()]
    })
    return merge<UserConfig>(baseWebConfig, options)
}
