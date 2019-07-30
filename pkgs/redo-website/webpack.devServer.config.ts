import merge from "webpack-merge"
import { devServerConfig } from "redo-bundle/webpack.base"
import { config } from "./webpack.common"
import isWsl from "is-wsl"
import open from "open"
import { exec } from "child_process"

const webDevServerConfig = merge.smart(devServerConfig, config, {
    devServer: {
        host: "0.0.0.0",
        after() {
            if (isWsl) {
                exec("echo 'start http://localhost:8080' | cmd.exe")
            } else {
                open("http://localhost:8080")
            }
        }
    }
} as any)

module.exports = [webDevServerConfig]
