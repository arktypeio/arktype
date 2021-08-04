import { existsSync, rmSync } from "fs"
import fetch from "node-fetch"
import {
    makeExecutable,
    streamToFile,
    fromRedo,
    getOs,
    ensureDir,
    getRedoZipFileName,
    getRedoExecutablePath
} from "@re-do/node-utils"
import Zip from "adm-zip"
import { Octokit } from "@octokit/rest"
import { join } from "path"
import { version } from "../package.json"
export { version } from "../package.json"

export const install = async (versionDir: string) => {
    console.log(`Installing Redo (version ${version})...`)
    ensureDir(versionDir)
    const gitHub = new Octokit().rest
    const { data } = await gitHub.repos.getReleaseByTag({
        owner: "re-do",
        repo: "redo",
        tag: `v${version}`
    })
    const zipName = getRedoZipFileName(getOs(), version)
    const appRelease = data.assets.find((asset) => asset.name === zipName)
    if (!appRelease) {
        throw new Error(`Unable to find a Redo release for your platform.`)
    }
    const { body } = await fetch(appRelease.browser_download_url)
    const zipPath = join(versionDir, zipName)
    await streamToFile(body, zipPath)
    const zipContents = new Zip(zipPath)
    zipContents.extractAllTo(versionDir, true)
    rmSync(zipPath)
    const executablePath = getRedoExecutablePath(versionDir)
    if (!existsSync(executablePath)) {
        throw new Error(
            `Installation failed: expected file at ${executablePath} did not exist.`
        )
    }
    makeExecutable(executablePath)
    console.log(`Succesfully installed Redo (${data.tag_name})!`)
}

export const getPath = async (version: string) => {
    const versionDir = fromRedo(version)
    const executablePath = getRedoExecutablePath(versionDir)
    if (!existsSync(executablePath)) {
        await install(versionDir)
    }
    return executablePath
}
