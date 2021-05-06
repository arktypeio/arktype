import {
    ViteDevServer,
    createServer,
    build,
    createLogger,
    UserConfig,
    LogLevel
} from "vite"
import electron from "electron"
import { ChildProcessWithoutNullStreams, spawn } from "child_process"

const mode = (process.env.MODE = process.env.MODE || "development")

const LOG_LEVEL: LogLevel = "warn"

const sharedConfig: UserConfig = {
    mode,
    build: {
        watch: {}
    },
    logLevel: LOG_LEVEL
}

type GetWatcherArgs = {
    name: string
    configFile: string
    writeBundle: () => void
}

const getWatcher = ({ name, configFile, writeBundle }: GetWatcherArgs) => {
    return build({
        ...sharedConfig,
        configFile,
        plugins: [{ name, writeBundle }]
    })
}

const setupMainPackageWatcher = (viteDevServer: ViteDevServer) => {
    // Write a value to an environment variable to pass it to the main process.
    {
        const protocol = `http${viteDevServer.config.server.https ? "s" : ""}:`
        const host = viteDevServer.config.server.host || "localhost"
        const port = viteDevServer.config.server.port // Vite searches for and occupies the first free port: 3000, 3001, 3002 and so on
        const path = "/"
        process.env.VITE_DEV_SERVER_URL = `${protocol}//${host}:${port}${path}`
    }

    const logger = createLogger(LOG_LEVEL, {
        prefix: "[main]"
    })

    let spawnProcess: ChildProcessWithoutNullStreams | null = null

    return getWatcher({
        name: "reload-app-on-main-package-change",
        configFile: "src/main/vite.config.ts",
        writeBundle: () => {
            if (spawnProcess !== null) {
                spawnProcess.kill("SIGINT")
                spawnProcess = null
            }

            spawnProcess = spawn(String(electron), ["."])

            spawnProcess.stdout.on(
                "data",
                (d) =>
                    d.toString().trim() &&
                    logger.warn(d.toString(), { timestamp: true })
            )
            spawnProcess.stderr.on(
                "data",
                (d) =>
                    d.toString().trim() &&
                    logger.error(d.toString(), { timestamp: true })
            )
        }
    })
}

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

;(async () => {
    try {
        const viteDevServer = await createServer({
            ...sharedConfig,
            configFile: "src/renderer/vite.config.ts"
        })

        await viteDevServer.listen()

        // await setupPreloadPackageWatcher(viteDevServer)
        await setupMainPackageWatcher(viteDevServer)
    } catch (e) {
        console.error(e)
        process.exit(1)
    }
})()
