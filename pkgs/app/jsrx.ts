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
import { mkdirSync, renameSync, rmSync, writeFileSync } from "fs"
import { PLAYWRIGHT_VERSION } from "@re-do/run"

const electronPath = require("electron")

const buildAll = async () => {
    await build(getMainConfig())
    await build(getObserverConfig())
    await build(getRendererConfig())
}

let mainProcess: ChildProcess | undefined

const startElectronCmd = `${electronPath} --inspect=9222 --remote-debugging-port=9223 .`

const restartMain = (startIfNotRunning: boolean) => {
    if (mainProcess && !mainProcess.killed) {
        treeKill(mainProcess.pid, () => {
            killExisting()
            mainProcess = shellAsync(startElectronCmd)
        })
    } else if (startIfNotRunning) {
        mainProcess = shellAsync(startElectronCmd)
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
            port: Number(process.env.VITE_DEV_SERVER_PORT)
        }
    })
    await viteDevServer.listen()
    await watchObserver()
    await watchMain()
}

const prepareRelease = () => {
    const dependenciesDir = join(__dirname, "release", "dependencies")
    rmSync(dependenciesDir, { recursive: true, force: true })
    mkdirSync(dependenciesDir, { recursive: true })
    // Only install non-bundled dependencies
    const packageJsonContents = require("./package.json")
    const electronReduxVersion =
        packageJsonContents.dependencies["electron-redux"]
    const releaseDependencies = {
        playwright: PLAYWRIGHT_VERSION,
        "electron-redux": electronReduxVersion
    }
    const releasePackageJsonContents = JSON.stringify({
        ...packageJsonContents,
        dependencies: releaseDependencies,
        devDependencies: {}
    })
    writeFileSync(
        join(dependenciesDir, "package.json"),
        releasePackageJsonContents
    )
    shell("npm install", {
        cwd: dependenciesDir
    })
    const nodeModulesSrcDir = join(dependenciesDir, "node_modules")
    const nodeModulesDestDir = join(dependenciesDir, "external")
    renameSync(nodeModulesSrcDir, nodeModulesDestDir)
    rmSync(join(nodeModulesDestDir, ".bin"), { recursive: true, force: true })
}

const createRelease = (publish: boolean) => {
    prepareRelease()
    shell(
        `electron-builder --config electron-builder.config.js --publish ${
            publish ? "always" : "never"
        }`
    )
}

jsrx(
    {
        dev: {
            start,
            lint: $(`prettier --write`),
            typecheck: $(`tsc --noEmit`),
            test: $(`echo 'This package has no tests.'`)
        },
        prod: {
            dryRun: () => createRelease(false),
            publish: () => createRelease(true),
            runProd: () => shellAsync(startElectronCmd)
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
