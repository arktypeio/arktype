import path from "path"
import getCurrentLine from "get-current-line"
import { LinePosition, narrow, deepEquals, toString } from "@re-do/utils"

export type SourcePosition = LinePosition & {
    file: string
    method: string
}

export type CallerOfOptions = {
    formatPath?: FormatFilePathOptions
    upStackBy?: number
    skip?: (position: SourcePosition) => boolean
    methodName?: string
}

const nonexistentCurrentLine = narrow({
    line: -1,
    char: -1,
    method: "",
    file: ""
})

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
        formatted = formatted.replace(RegExp(`\\${path.sep}`, "g"), seperator)
    }
    return formatted
}

export const caller = (options: CallerOfOptions = {}): SourcePosition => {
    let { upStackBy = 0, formatPath, skip, methodName } = options
    if (!methodName) {
        upStackBy = 3
    }
    let match: SourcePosition | undefined
    while (!match) {
        const location = getCurrentLine({
            method: methodName,
            frames: upStackBy
        })
        if (!location || deepEquals(location, nonexistentCurrentLine)) {
            throw new Error(
                `No caller of '${methodName}' matches given options ${toString(
                    options
                )}.`
            )
        }
        const candidate = {
            file: formatFilePath(location.file, formatPath ?? {}),
            line: location.line,
            column: location.char,
            method: location.method
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
