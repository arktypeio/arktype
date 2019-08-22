import { resolve } from "path"
import { makeConfig, isDev } from "redo-bundle"

const mainConfig = makeConfig({
    base: "main",
    entry: resolve(__dirname, "src", "main", "index.ts")
})

const rendererConfig = makeConfig({
    base: "renderer",
    entry: resolve(__dirname, "src", "renderer", "index.tsx")
})

const injectedConfig = makeConfig({
    base: "injected",
    entry: [resolve(__dirname, "src", "injected", "index.ts")]
})

// renderer config is consumed through devServer during development
export default (isDev
    ? [mainConfig, injectedConfig]
    : [mainConfig, rendererConfig, injectedConfig])
