import { jsrx, $, shell } from "jsrx"
import { createServer, build } from "vite"
import { ChildProcess, shellAsync } from "@re-do/node-utils"
import {
    getMainConfig,
    getRendererConfig,
    getObserverConfig
} from "./viteConfigs"
import { join } from "path"

const electronPath = require("electron")

const buildAll = async () => {
    await build(getMainConfig())
    await build(getObserverConfig())
    await build(getRendererConfig())
}

let mainProcess: ChildProcess | undefined

const startMain = () => {
    mainProcess = shellAsync(`${electronPath} --remote-debugging-port=9223 "."`)
}

const restartMain = (startIfNotRunning: boolean) => {
    if (mainProcess && !mainProcess.killed) {
        mainProcess.kill()
        startMain()
    } else if (startIfNotRunning) {
        startMain()
    }
}

const watchMain = async () =>
    build({
        ...getMainConfig({ watch: true }),
        plugins: [
            {
                name: "main-watcher",
                writeBundle: () => restartMain(true)
            }
        ]
    })

const watchObserver = () =>
    build({
        ...getObserverConfig({ watch: true }),
        plugins: [
            {
                name: "observer-watcher",
                writeBundle: () => restartMain(false)
            }
        ]
    })

const start = async () => {
    const viteDevServer = await createServer({
        ...getRendererConfig({ watch: true }),
        server: {
            port: Number(process.env.DEV_SERVER_PORT)
        }
    })
    await viteDevServer.listen()
    await watchObserver()
    await watchMain()
}

jsrx(
    {
        dev: {
            start,
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
