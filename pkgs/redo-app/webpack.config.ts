import merge from "webpack-merge"
import { resolve } from "path"
import { IgnorePlugin } from "webpack"
import {
    commonConfig,
    rendererConfig,
    webConfig,
    isDev
} from "./webpack.common"

const mainConfig = merge.smart(commonConfig, {
    target: "electron-main",
    entry: [resolve(__dirname, "src", "main", "index.ts")],
    output: {
        filename: "main.js"
    }
})

const browserConfig = merge.smart(webConfig, {
    entry: [resolve(__dirname, "src", "browser", "index.ts")],
    output: {
        filename: "browser.js"
    },
    plugins: [new IgnorePlugin(/fs/)]
})
module.exports = isDev()
    ? [mainConfig, browserConfig]
    : [mainConfig, rendererConfig, browserConfig]
