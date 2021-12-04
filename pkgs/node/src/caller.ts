import path from "path"
import getCurrentLine from "get-current-line"
import { LinePosition, narrow, deepEquals, toString } from "@re-do/utils"

export type SourcePosition = LinePosition & {
    file: string
    method: string
}

export type CallerOfOptions = {
    relative?: boolean | string
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

export const getRelativeFilePath = (
    original: string,
    relativeFileOption: string | boolean | undefined
) =>
    relativeFileOption
        ? path.relative(
              typeof relativeFileOption === "string"
                  ? relativeFileOption
                  : process.cwd(),
              original
          )
        : original

export const caller = (options: CallerOfOptions = {}): SourcePosition => {
    let { upStackBy = 0, relative, skip, methodName } = options
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
            file: getRelativeFilePath(location.file, relative),
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
