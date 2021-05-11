import { jsrx, $, shell } from "jsrx"
import { createServer, build } from "vite"
import { ChildProcess, shellAsync } from "@re-do/node-utils"
import {
    getMainConfig,
    getRendererConfig,
    getObserverConfig
} from "./viteConfigs"
import { join } from "path"
import { ViteDevServer } from "vite"

const electronPath = require("electron")

const buildAll = async () => {
    await build(getMainConfig())
    await build(getRendererConfig())
}

let mainProcess: ChildProcess | undefined

const watchMain = async () =>
    build({
        ...getMainConfig({ watch: true }),
        plugins: [
            {
                name: "main-watcher",
                writeBundle: async () => {
                    if (mainProcess && !mainProcess.killed) {
                        mainProcess.kill()
                    }
                    mainProcess = shellAsync(
                        `${electronPath} --remote-debugging-port=9223 "."`
                    )
                }
            }
        ]
    })

const watchObserver = (devServer: ViteDevServer) =>
    build({
        ...getObserverConfig({ watch: true }),
        plugins: [
            {
                name: "observer-watcher",
                writeBundle: async () => {
                    devServer.ws.send({
                        type: "full-reload"
                    })
                }
            }
        ]
    })

const watch = async () => {
    const viteDevServer = await createServer({
        ...getRendererConfig({ watch: true }),
        server: {
            port: Number(process.env.DEV_SERVER_PORT)
        }
    })
    await viteDevServer.listen()
    await watchMain()
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
        excludeOthers: true,
        envFiles: {
            dev: join(__dirname, ".env"),
            prod: join(__dirname, ".env.production")
        }
    }
)
