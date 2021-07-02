import { existsSync } from "fs"
import fetch from "node-fetch"
import {
    makeExecutable,
    REDO_EXECUTABLE,
    EXECUTABLE_SUFFIX,
    streamToFile,
    ensureRedoDir
} from "@re-do/node-utils"

import { Octokit } from "@octokit/rest"

export const install = async (path: string) => {
    console.log("Installing the latest version of Redo...")
    ensureRedoDir()
    const gitHub = new Octokit().rest
    const { data } = await gitHub.repos.getLatestRelease({
        owner: "re-do",
        repo: "redo"
    })
    const appRelease = data.assets.find((asset) =>
        asset.name.endsWith(".AppImage")
    )
    if (!appRelease) {
        throw new Error(`Unable to find a Redo release for your platform.`)
    }
    const { body } = await fetch(appRelease.browser_download_url)
    makeExecutable(await streamToFile(body, path))
    console.log(`Succesfully installed Redo (${data.tag_name})!`)
    return REDO_EXECUTABLE
}

export const getPath = async (): Promise<string> =>
    existsSync(REDO_EXECUTABLE)
        ? REDO_EXECUTABLE
        : await install(REDO_EXECUTABLE)
