import treeKill from "tree-kill"
import { join } from "path"
import { writeFileSync } from "fs"
import { build } from "vite"
import {
    ChildProcess,
    shell,
    shellAsync,
    getNodeConfig,
    getWebConfig,
    checkTypes
} from "@re-do/node"
import { startElectronCmd, killExisting, srcDir, outDir } from "./common"

let mainProcess: ChildProcess | undefined

export const restartMain = (startIfNotRunning: boolean) => {
    if (mainProcess && !mainProcess.killed) {
        treeKill(mainProcess.pid, () => {
            killExisting()
            mainProcess = shellAsync(startElectronCmd)
        })
    } else if (startIfNotRunning) {
        mainProcess = shellAsync(startElectronCmd)
    }
}

const localResolves = [
    { find: "main", replacement: join(srcDir, "main") },
    {
        find: "renderer",
        replacement: join(srcDir, "renderer")
    },
    {
        find: "observer",
        replacement: join(srcDir, "observer")
    },
    { find: "common", replacement: join(srcDir, "common") },
    {
        find: "assets",
        replacement: join(srcDir, "assets")
    }
]

export type GetConfigArgs = {
    watch?: boolean
}

const watchMainPlugin = {
    name: "watchMain",
    writeBundle: () => restartMain(true)
}

const watchObserverPlugin = {
    name: "observer-watcher",
    writeBundle: () => restartMain(false)
}

const addPreloadScriptPlugin = {
    name: "add-renderer-preload-script",
    writeBundle: () =>
        writeFileSync(
            join(outDir, "main", "preload.js"),
            `require("electron-redux/preload")`
        )
}

export const getMainConfig = ({ watch }: GetConfigArgs = {}) =>
    getNodeConfig({
        srcDir: join(srcDir, "main"),
        outDir: join(outDir, "main"),
        watch: watch ?? false,
        options: {
            build: {
                sourcemap: false
            },
            resolve: {
                alias: localResolves
            },
            plugins: watch
                ? [addPreloadScriptPlugin, watchMainPlugin]
                : [addPreloadScriptPlugin]
        }
    })

export const getRendererConfig = ({ watch }: GetConfigArgs = {}) =>
    getWebConfig({
        srcDir: join(srcDir, "renderer"),
        outDir: join(outDir, "renderer"),
        watch: watch ?? false,
        options: {
            base: "./",
            build: {
                sourcemap: false
            },
            resolve: {
                alias: localResolves
            }
        }
    })

export const getObserverConfig = ({ watch }: GetConfigArgs = {}) =>
    getNodeConfig({
        srcDir: join(srcDir, "observer"),
        outDir: join(outDir, "observer"),
        watch: watch ?? false,
        formats: ["es"],
        options: {
            build: {
                target: "esnext",
                sourcemap: false
            },
            resolve: {
                alias: localResolves
            },
            plugins: watch ? [watchObserverPlugin] : []
        }
    })

export const buildMain = async () => build(getMainConfig())

export const buildRenderer = async () => build(getRendererConfig())

export const buildObserver = async () => build(getObserverConfig())

export const buildAll = async () => {
    checkTypes()
    await Promise.all([buildRenderer(), buildObserver()])
    return await buildMain()
}
