import electronDevtoolsInstaller, {
    REACT_DEVELOPER_TOOLS,
    APOLLO_DEVELOPER_TOOLS,
    REDUX_DEVTOOLS
} from "electron-devtools-installer"

export const installDevTools = async () => {
    const extensions = {
        REACT_DEVELOPER_TOOLS,
        APOLLO_DEVELOPER_TOOLS,
        REDUX_DEVTOOLS
    }
    for (const [name, reference] of Object.entries(extensions)) {
        try {
            console.log(`Installing ${name}...`)
            await electronDevtoolsInstaller(reference.id)
        } catch (e) {
            console.log(`Failed to install ${name}:`)
            console.log(e)
        }
    }
}

import * as fs from "fs"
import * as path from "path"

const unzip: any = require("unzip-crx-3")

const downloadChromeExtension = (
    chromeStoreID: string,
    forceDownload?: boolean,
    attempts = 5
): Promise<string> => {
    const extensionsStore = getPath()
    if (!fs.existsSync(extensionsStore)) {
        fs.mkdirSync(extensionsStore, { recursive: true })
    }
    const extensionFolder = path.resolve(`${extensionsStore}/${chromeStoreID}`)
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(extensionFolder) || forceDownload) {
            if (fs.existsSync(extensionFolder)) {
                fs.rmSync(extensionFolder, { recursive: true, force: true })
            }
            const fileURL = `https://clients2.google.com/service/update2/crx?response=redirect&acceptformat=crx2,crx3&x=id%3D${chromeStoreID}%26uc&prodversion=32` // eslint-disable-line
            const filePath = path.resolve(`${extensionFolder}.crx`)
            downloadFile(fileURL, filePath)
                .then(() => {
                    unzip(filePath, extensionFolder)
                        .then(() => {
                            changePermissions(extensionFolder, 755)
                            resolve(extensionFolder)
                        })
                        .catch((err: Error) => {
                            if (
                                !fs.existsSync(
                                    path.resolve(
                                        extensionFolder,
                                        "manifest.json"
                                    )
                                )
                            ) {
                                return reject(err)
                            }
                        })
                })
                .catch((err) => {
                    console.log(
                        `Failed to fetch extension, trying ${
                            attempts - 1
                        } more times`
                    ) // eslint-disable-line
                    if (attempts <= 1) {
                        return reject(err)
                    }
                    setTimeout(() => {
                        downloadChromeExtension(
                            chromeStoreID,
                            forceDownload,
                            attempts - 1
                        )
                            .then(resolve)
                            .catch(reject)
                    }, 200)
                })
        } else {
            resolve(extensionFolder)
        }
    })
}

import { app, net } from "electron"
import * as https from "https"

export const getPath = () => {
    const savePath = app.getPath("userData")
    return path.resolve(`${savePath}/extensions`)
}

// Use https.get fallback for Electron < 1.4.5
const request: typeof https.request = net ? (net.request as any) : https.get

export const downloadFile = (from: string, to: string) => {
    return new Promise<void>((resolve, reject) => {
        const req = request(from)
        req.on("response", (res) => {
            // Shouldn't handle redirect with `electron.net`, this is for https.get fallback
            if (
                res.statusCode &&
                res.statusCode >= 300 &&
                res.statusCode < 400 &&
                res.headers.location
            ) {
                return downloadFile(res.headers.location, to)
                    .then(resolve)
                    .catch(reject)
            }
            res.pipe(fs.createWriteStream(to)).on("close", resolve)
            res.on("error", reject)
        })
        req.on("error", reject)
        req.end()
    })
}

export const changePermissions = (dir: string, mode: string | number) => {
    const files = fs.readdirSync(dir)
    files.forEach((file) => {
        const filePath = path.join(dir, file)
        fs.chmodSync(filePath, parseInt(`${mode}`, 8))
        if (fs.statSync(filePath).isDirectory()) {
            changePermissions(filePath, mode)
        }
    })
}
