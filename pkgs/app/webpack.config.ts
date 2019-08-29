import { resolve } from "path"
import { makeConfig, isDev } from "@re-do/bundle"

const tsconfig = resolve(__dirname, "tsconfig.json")

const mainConfig = makeConfig({
    base: "main",
    entry: resolve(__dirname, "src", "main", "index.ts"),
    tsconfig
})

const rendererConfig = makeConfig({
    base: "renderer",
    entry: resolve(__dirname, "src", "renderer", "index.tsx"),
    tsconfig
})

const injectedConfig = makeConfig({
    base: "injected",
    entry: resolve(__dirname, "src", "injected", "index.ts"),
    tsconfig
})

// renderer config is consumed through devServer during development
export default isDev()
    ? [mainConfig, injectedConfig]
    : [mainConfig, rendererConfig, injectedConfig]
