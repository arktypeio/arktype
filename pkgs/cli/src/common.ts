import { ensureDirSync } from "fs-extra"
import { homedir } from "os"
import { join } from "path"

export const redoDir = join(homedir(), ".redo")
ensureDirSync(redoDir)

const executableSuffixes = {
    darwin: "-mac.zip",
    linux: ".AppImage",
    win32: ".exe"
}

export type supportedOs = keyof typeof executableSuffixes

export const os = process.platform
if (!(os in executableSuffixes)) {
    throw new Error(`Redo does not support os: '${os}'.`)
}
export const executableSuffix = executableSuffixes[os as supportedOs]
export const appExecutable = join(redoDir, `redo${executableSuffix}`)
