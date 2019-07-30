import { isDev } from "redo-bundle/webpack.base"
import { mainConfig, rendererConfig, browserConfig } from "./webpack.common"

module.exports = isDev()
    ? [mainConfig, browserConfig]
    : [mainConfig, rendererConfig, browserConfig]
