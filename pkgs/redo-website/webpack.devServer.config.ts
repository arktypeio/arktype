import merge from "webpack-merge"
import { devServerConfig } from "redo-bundle/webpack.base"
import { config } from "./webpack.common"

const webDevServerConfig = merge.smart(config, devServerConfig, {
    devServer: {
        host: "0.0.0.0",
        useLocalIp: true,
        open: true
    }
} as any)

module.exports = [webDevServerConfig]
