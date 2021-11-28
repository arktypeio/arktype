import getCurrentLine from "get-current-line"
import { Func } from "./common.js"
import { LinePosition } from "./stringPositions.js"

export type SourcePosition = LinePosition & {
    file: string
    method: string
}

export type SourceRange = { file: string; from: LinePosition; to: LinePosition }

export type GetSourceRange = () => SourceRange

export type WithArgsRange<F extends Func<[GetSourceRange, ...any[]]>> =
    F extends (getRange: GetSourceRange, ...rest: infer Rest) => infer Return
        ? (...args: Rest) => () => Return
        : F

export const withArgsRange = <F extends Func>(f: F) => {
    const startArgsRange = (...args: any[]) => {
        const { file: fromFile, ...from } = callerOf("startArgsRange")
        const getRange: GetSourceRange = () => {
            const { file, ...to } = callerOf("endArgsRange")
            if (file !== fromFile) {
                throw new Error(
                    `To get the source range of args, return value must be accessed immediately, e.g.:\n` +
                        `doSomethingRequiringArgRange(...someParams)()`
                )
            }
            return {
                file,
                from,
                to
            }
        }
        const endArgsRange = () => f(getRange, ...args)
        return endArgsRange
    }
    return startArgsRange as WithArgsRange<F>
}

export type CallerOfOptions = {
    upStackBy?: number
}

export const callerOf = (
    methodName: string,
    { upStackBy }: CallerOfOptions = {}
): SourcePosition => {
    const { file, line, char, method } = getCurrentLine({
        method: methodName,
        frames: upStackBy ?? 0,
        immediate: false
    })
    return {
        file,
        line,
        column: char,
        method
    }
}

export const callsAgo = (num: number) =>
    callerOf("callsAgo", { upStackBy: num })

export const caller = () => callsAgo(2)
