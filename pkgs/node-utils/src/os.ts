import { ValueOf, isIn } from "@re-do/utils"

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

type SupportedOs = ValueOf<SupportedOsMap>
export const supportedOs = [...Object.values(supportedOsMap)] as SupportedOs[]

export const getOs = () => {
    const platform = process.platform
    if (!isIn(supportedPlatforms, platform)) {
        throw new Error(
            `Redo does not support platform '${platform}'. Options are ${supportedPlatforms}.`
        )
    }
    return supportedOsMap[platform as SupportedPlatform]
}

export const getRedoZipFileName = (os: SupportedOs, version: string) => `redo-${version}-${os}.zip`
