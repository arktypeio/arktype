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
} from "@re-do/node"
import Zip from "adm-zip"
import { Octokit } from "@octokit/rest"
import { createActionAuth } from "@octokit/auth-action"
import { join } from "path"
import { fromPackageRoot, readJson } from "@re-do/node"

export const version = readJson(fromPackageRoot("package.json")).version
export const install = async (version: string, toDir: string) => {
    console.log(`Installing Redo (version ${version})...`)
    ensureDir(toDir)
    const gitHub = new Octokit(
        process.env.GITHUB_TOKEN
            ? { auth: (await createActionAuth()()).token }
            : {}
    ).rest
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
    const zipPath = join(toDir, zipName)
    await streamToFile(body, zipPath)
    const zipContents = new Zip(zipPath)
    zipContents.extractAllTo(toDir, true)
    rmSync(zipPath)
    const executablePath = getRedoExecutablePath(toDir)
    if (!existsSync(executablePath)) {
        throw new Error(
            `Installation failed: expected file at ${executablePath} did not exist.`
        )
    }
    makeExecutable(executablePath)
    console.log(`Succesfully installed Redo (version ${version})!`)
}

export const getPath = async (version: string) => {
    const versionDir = fromRedo(version)
    const executablePath = getRedoExecutablePath(versionDir)
    if (!existsSync(executablePath)) {
        await install(version, versionDir)
    }
    return executablePath
}
