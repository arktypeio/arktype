import { streamToFile, walkPaths, ensureDir } from "@re-do/node"
import { app, session } from "electron"
import { existsSync, chmodSync, rmSync } from "fs"
import { join, resolve } from "path"
import fetch from "node-fetch"
// @ts-ignore
import unzipCrx from "unzip-crx-3"

export const installDevTools = async () => {
    const extensions = {
        REACT_DEVELOPER_TOOLS: "ljjemllljcmogpfapbkkighbhhppjdbg",
        APOLLO_DEVELOPER_TOOLS: "jdkknkkbebbapilgoeccciglkfbmbnfm",
        REDUX_DEVTOOLS: "lmhkpmbekcpmknklioeibfkpmmfibljd"
    }
    for (const [name, id] of Object.entries(extensions)) {
        try {
            await loadChromeExtension({ name, id })
        } catch (e) {
            console.log(`Failed to install ${name}:`)
            console.log(e)
        }
    }
}

type LoadExtensionArgs = {
    name: string
    id: string
}

const loadChromeExtension = async (args: LoadExtensionArgs) => {
    const { name, id } = args
    const extensionsStore = join(app.getPath("userData"), "extensions")
    ensureDir(extensionsStore)
    const extensionDir = resolve(`${extensionsStore}/${id}`)
    if (existsSync(extensionDir)) {
        try {
            await session.defaultSession.loadExtension(extensionDir)
            return
        } catch {
            console.log(
                `Couldn't load existing extension '${name}' at ${extensionDir}, reinstalling...`
            )
            rmSync(extensionDir, { recursive: true, force: true })
        }
    }
    await downloadExtension(args, extensionDir)
    await session.defaultSession.loadExtension(extensionDir)
}

const downloadExtension = async (
    { name, id }: LoadExtensionArgs,
    extensionDir: string
) => {
    process.stdout.write(`Installing ${name}...`)
    const extensionUrl =
        `https://clients2.google.com/service/update2/crx?response=redirect&` +
        `acceptformat=crx2,crx3&x=id%3D${id}%26uc&prodversion=32`
    const downloadPath = resolve(`${extensionDir}.crx`)
    const { body } = await fetch(extensionUrl)
    await streamToFile(body as any, downloadPath)
    await unzipCrx(downloadPath, extensionDir)
    rmSync(downloadPath)
    walkPaths(extensionDir, { excludeDirs: true }).forEach((file) =>
        chmodSync(file, parseInt(`755`, 8))
    )
    console.log(`✅`)
}
