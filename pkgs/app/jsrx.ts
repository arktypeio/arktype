import { jsrx, $, shell } from "jsrx"
import treeKill from "tree-kill"
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

const cmdString = `${electronPath} --inspect=9222 --remote-debugging-port=9223 .`

const restartMain = (startIfNotRunning: boolean) => {
    if (mainProcess && !mainProcess.killed) {
        treeKill(mainProcess.pid, () => {
            killExisting()
            mainProcess = shellAsync(cmdString)
        })
    } else if (startIfNotRunning) {
        mainProcess = shellAsync(cmdString)
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

// kill any leftover processses to ensure debug ports are free
// the echo is to ensure we don't throw an error if no processes are found
// the brackets ensure pkill won't kill itself :O
const killExisting = () =>
    shell(`echo $(pkill -9 -f '[\-]-remote-debugging-port=9223')`)

const start = async () => {
    killExisting()
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

type PlatformString = "linux" | "macos" | "windows"

const release = (platforms: PlatformString[], publish = false) => {
    const platformFlags = platforms.map((_) => `--${_}`).join(" ")
    try {
        shell(
            `electron-builder ${platformFlags} --config.asar=false --config electron-builder.config.js --publish ${
                publish ? "always" : "never"
            }`
        )
    } catch (e) {
        console.error(
            `Encountered the following error while building electron:\n${e}`
        )
    }
}

jsrx(
    {
        dev: {
            start,
            lint: $(`prettier --write`),
            typecheck: $(`tsc --noEmit`),
            test: $(`jest`)
        },
        prod: {
            release: () => release(["linux", "macos", "windows"]),
            releaseLinux: () => release(["linux"]),
            releaseMac: () => release(["macos"]),
            releaseWindows: () => release(["windows"]),
            publish: () => release(["linux", "macos", "windows"], true),
            publishLinux: () => release(["linux"], true),
            publishMac: () => release(["macos"], true),
            publishWindows: () => release(["windows"], true)
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
