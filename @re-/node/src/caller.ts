import path from "node:path"
import { isDeepStrictEqual } from "node:util"
// @ts-ignore Can't resolve these types yet with NodeNext
import getCurrentLine from "get-current-line"

export interface LinePosition {
    line: number
    char: number
}

export interface SourcePosition extends LinePosition {
    file: string
    method: string
}

export type CallerOfOptions = {
    formatPath?: FormatFilePathOptions
    upStackBy?: number
    skip?: (position: SourcePosition) => boolean
    methodName?: string
}

const nonexistentCurrentLine = {
    line: -1,
    char: -1,
    method: "",
    file: ""
}

export type FormatFilePathOptions = {
    relative?: string | boolean
    seperator?: string
}

export const formatFilePath = (
    original: string,
    { relative, seperator }: FormatFilePathOptions
) => {
    let formatted = original
    if (relative) {
        formatted = path.relative(
            typeof relative === "string" ? relative : process.cwd(),
            original
        )
    }
    if (seperator) {
        formatted = formatted.replace(
            new RegExp(`\\${path.sep}`, "g"),
            seperator
        )
    }
    return formatted
}

export const caller = (options: CallerOfOptions = {}): SourcePosition => {
    let { upStackBy = 0 } = options
    const { formatPath, skip, methodName } = options
    if (!methodName) {
        upStackBy = 3
    }
    let match: SourcePosition | undefined
    while (!match) {
        const location = getCurrentLine({
            method: methodName,
            frames: upStackBy
        })
        if (!location || isDeepStrictEqual(location, nonexistentCurrentLine)) {
            throw new Error(
                `No caller of '${methodName}' matches given options: ${JSON.stringify(
                    options,
                    null,
                    4
                )}.`
            )
        }
        const candidate = {
            ...location,
            file: formatFilePath(location.file, formatPath ?? {})
        }
        if (skip?.(candidate)) {
            upStackBy++
        } else {
            match = candidate
        }
    }
    return match
}

export const callsAgo = (
    num: number,
    options: Omit<CallerOfOptions, "upStackBy"> = {}
) => caller({ methodName: "callsAgo", upStackBy: num, ...options })
