import { resolve } from "path"
import { makeConfig } from "@re-do/bundle"
import { isDev } from "@re-do/utils/dist/node"

const tsconfig = resolve(__dirname, "tsconfig.json")

const mainConfig = makeConfig({
    base: "main",
    entry: resolve(__dirname, "src", "main", "index.ts"),
    tsconfig
})

const rendererConfig = makeConfig(
    {
        base: "renderer",
        entry: resolve(__dirname, "src", "renderer", "index.tsx"),
        tsconfig
    },
    [{ output: { publicPath: "." } }]
)

const injectedConfig = makeConfig({
    base: "injected",
    entry: resolve(__dirname, "src", "injected", "index.ts"),
    tsconfig
})

// renderer config is consumed through devServer during development
export default isDev()
    ? [mainConfig, injectedConfig]
    : [mainConfig, rendererConfig, injectedConfig]
