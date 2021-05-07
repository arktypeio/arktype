import "dotenv/config"
import { createServer, build } from "vite"
import { ChildProcess, shellAsync } from "@re-do/node-utils"

const electronPath = require("electron")

type GetWatcherArgs = {
    name: string
    configFile: string
    writeBundle: () => void
}

const getWatcher = ({ name, configFile, writeBundle }: GetWatcherArgs) => {
    return build({
        configFile,
        plugins: [{ name, writeBundle }]
    })
}

const setupMainPackageWatcher = () => {
    let mainProcess: ChildProcess

    return getWatcher({
        name: "reload-app-on-main-package-change",
        configFile: "src/main/vite.config.ts",
        writeBundle: async () => {
            if (mainProcess.killed) {
                mainProcess.kill()
            }
            mainProcess = shellAsync(`${electronPath} "."`)
        }
    })
}

const start = async () => {
    const viteDevServer = await createServer({
        server: {
            port: Number(process.env.DEV_SERVER_PORT)
        },
        configFile: "src/renderer/vite.config.ts"
    })
    await viteDevServer.listen()
    await setupMainPackageWatcher()
}

start()

// const setupPreloadPackageWatcher = (viteDevServer: ViteDevServer) => {
//     return getWatcher({
//         name: "reload-page-on-preload-package-change",
//         configFile: "packages/preload/vite.config.js",
//         writeBundle() {
//             viteDevServer.ws.send({
//                 type: "full-reload"
//             })
//         }
//     })
// }
