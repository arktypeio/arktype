import { spawn } from "child_process"
import merge from "webpack-merge"
import { devServerConfig, rendererConfig } from "./webpack.common"

const rendererDevServerConfig = merge.smart(rendererConfig, devServerConfig, {
    devServer: {
        after() {
            spawn("npm", ["run", "electron"], {
                shell: true,
                env: process.env,
                stdio: "inherit"
            })
                .on("close", code => process.exit(code))
                .on("error", spawnError => console.error(spawnError))
        }
    }
} as any)

module.exports = [rendererDevServerConfig]
