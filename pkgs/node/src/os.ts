import type { PropertyOf } from "@re-do/utils"
import { join } from "path"
import killTreeCallback from "tree-kill"
import { promisify } from "util"

export const killTree = promisify(killTreeCallback)

const supportedOsMap = {
    darwin: "mac",
    linux: "linux",
    win32: "windows",
    win64: "windows"
} as const

type SupportedOsMap = typeof supportedOsMap

type SupportedPlatform = keyof SupportedOsMap
export const supportedPlatforms = Object.keys(
    supportedOsMap
) as SupportedPlatform[]

type SupportedOs = PropertyOf<SupportedOsMap>
export const supportedOs = [...Object.values(supportedOsMap)] as SupportedOs[]

export const getOs = () => {
    const platform = process.platform
    if (platform in supportedPlatforms) {
        throw new Error(
            `Redo does not support platform '${platform}'. Options are ${supportedPlatforms.join(
                ", "
            )}.`
        )
    }
    return supportedOsMap[platform as SupportedPlatform]
}

export const getRedoZipFileName = (os: SupportedOs, version: string) =>
    `redo-${version}-${os}.zip`

export const getRedoExecutablePath = (baseDir: string) => {
    const os = getOs()
    if (os === "windows") {
        return join(baseDir, "redo.exe")
    } else if (os === "linux") {
        return join(baseDir, "redo")
    } else {
        return join(baseDir, "redo.app", "Contents", "MacOS", "redo")
    }
}
