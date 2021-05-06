import { resolve } from "path"
import { makeConfig } from "@re-do/bundle"
import { isDev } from "@re-do/node-utils"

export const tsconfig = resolve(__dirname, "tsconfig.json")

export const externalPlaywrightConfig = {
    externals: {
        "playwright-core": "require('playwright-core')"
    }
}

const mainConfig = makeConfig(
    {
        base: "main",
        entry: resolve(__dirname, "src", "main", "index.ts"),
        tsconfig
    },
    [externalPlaywrightConfig]
)

export const rendererEntry = resolve(__dirname, "src", "renderer", "index.tsx")

const rendererConfig = makeConfig(
    {
        base: "renderer",
        entry: rendererEntry,
        tsconfig
    },
    [externalPlaywrightConfig, { output: { publicPath: "." } }]
)

const observerConfig = makeConfig(
    {
        base: "web",
        entry: resolve(__dirname, "src", "observer", "index.ts"),
        tsconfig
    },
    [
        externalPlaywrightConfig,
        {
            output: {
                filename: "observer.js"
            }
        }
    ]
)

// renderer config is consumed through devServer during development
export default isDev()
    ? [mainConfig, observerConfig]
    : [mainConfig, rendererConfig, observerConfig]
