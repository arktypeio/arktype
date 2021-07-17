import { jsrx, $, shell } from "jsrx"
import treeKill from "tree-kill"
import { createServer, build } from "vite"
import { ChildProcess, shellAsync } from "@re-do/node-utils"
import { join } from "path"
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "fs"
import { getNodeConfig, getWebConfig } from "@re-do/configs"
import { dirName } from "./dirName"

const packageJsonContents = JSON.parse(
    readFileSync(join(dirName, "package.json")).toString()
)

const pkgRoot = join(dirName, "src")
const outRoot = join(dirName, "dist")

const localResolves = [
    { find: "main", replacement: join(pkgRoot, "main") },
    {
        find: "renderer",
        replacement: join(pkgRoot, "renderer")
    },
    {
        find: "observer",
        replacement: join(pkgRoot, "observer")
    },
    { find: "common", replacement: join(pkgRoot, "common") },
    {
        find: "assets",
        replacement: join(pkgRoot, "assets")
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
            join(outRoot, "main", "preload.js"),
            `require("electron-redux/preload")`
        )
}

export const getMainConfig = ({ watch }: GetConfigArgs = {}) =>
    getNodeConfig({
        srcDir: join(pkgRoot, "main"),
        outDir: join(outRoot, "main"),
        watch,
        options: {
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
        srcDir: join(pkgRoot, "renderer"),
        outDir: join(outRoot, "renderer"),
        watch,
        options: {
            base: "./",
            resolve: {
                alias: localResolves
            }
        }
    })

export const getObserverConfig = ({ watch }: GetConfigArgs = {}) =>
    getNodeConfig({
        srcDir: join(pkgRoot, "observer"),
        outDir: join(outRoot, "observer"),
        watch,
        formats: ["es"],
        options: {
            build: {
                target: "esnext"
            },
            resolve: {
                alias: localResolves
            },
            plugins: watch ? [watchObserverPlugin] : []
        }
    })

const electronPath = join(dirName, "node_modules", ".bin", "electron")

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
    await build(getObserverConfig({ watch: true }))
    await build(getMainConfig({ watch: true }))
}

const prepareRelease = () => {
    const dependenciesDir = join(dirName, "release", "dependencies")
    rmSync(dependenciesDir, { recursive: true, force: true })
    mkdirSync(dependenciesDir, { recursive: true })
    // Only install non-bundled dependencies
    const releaseDependencies = {
        playwright: packageJsonContents.dependencies["playwright"],
        "electron-redux": packageJsonContents.dependencies["electron-redux"]
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
            dev: join(dirName, ".env"),
            prod: join(dirName, ".env.production")
        }
    }
)
