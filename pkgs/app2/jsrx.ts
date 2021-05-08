import { jsrx, $, shell } from "jsrx"
import { createServer, build } from "vite"
import { ChildProcess, isDev, shellAsync } from "@re-do/node-utils"

const electronPath = require("electron")
const viteConfigs = ["src/main/vite.config.ts", "src/renderer/vite.config.ts"]
const mode = isDev() ? "development" : "production"

const buildAll = async () => {
    for (const configFile of viteConfigs) {
        await build({
            configFile,
            mode
        })
    }
}

type GetWatcherArgs = {
    name: string
    configFile: string
    writeBundle: () => void
}

const getWatcher = ({ name, configFile, writeBundle }: GetWatcherArgs) => {
    return build({
        configFile,
        plugins: [{ name, writeBundle }],
        mode
    })
}

const setupMainPackageWatcher = () => {
    let mainProcess: ChildProcess

    return getWatcher({
        name: "reload-app-on-main-package-change",
        configFile: "src/main/vite.config.ts",
        writeBundle: async () => {
            if (mainProcess && !mainProcess.killed) {
                mainProcess.kill()
            }
            mainProcess = shellAsync(`${electronPath} "."`)
        }
    })
}

const watch = async () => {
    const viteDevServer = await createServer({
        server: {
            port: Number(process.env.DEV_SERVER_PORT)
        },
        configFile: "src/renderer/vite.config.ts"
    })
    await viteDevServer.listen()
    await setupMainPackageWatcher()
}

jsrx(
    {
        dev: {
            watch,
            lint: $(`prettier --write`),
            typecheck: $(`tsc --noEmit`)
        },
        prod: {
            compile: $(
                `electron-builder build --config electron-builder.config.js --dir --config.asar=false`
            )
        },
        shared: {
            build: () => buildAll()
        }
    },
    {
        excludeOthers: true
    }
)

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
