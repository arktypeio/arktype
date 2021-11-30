import { relative } from "path"
import getCurrentLine from "get-current-line"
import {
    LinePosition,
    Func,
    Key,
    FilterFunction,
    narrow,
    deepEquals,
    stringify
} from "@re-do/utils"

export type SourcePosition = LinePosition & {
    file: string
    method: string
}

export type SourceRange = { file: string; from: LinePosition; to: LinePosition }

export type WithArgsRange<
    F extends Func<[SourceRange, ...any[]], Func | Record<Key, any>>,
    AllProp extends string,
    AllPropAsFunction extends boolean,
    AllAsFunction extends boolean,
    AllAsChainedFunction extends boolean,
    ChainedFunctionResult
> = F extends (range: SourceRange, ...rest: infer Rest) => infer Return
    ? (...args: Rest) => Return extends Func
          ? Return
          : AllAsFunction extends true
          ? () => Return
          : AllAsChainedFunction extends true
          ? (
                withReturned: (returned: Return) => ChainedFunctionResult
            ) => ChainedFunctionResult
          : Return & {
                [K in AllProp]: AllPropAsFunction extends true
                    ? () => Return
                    : Return
            }
    : `To add an args range, first parameter must be a SourceRange and the return must be another function or an object.`

export type WithArgsRangeOptions<
    AllProp extends string,
    AllPropAsFunction extends boolean,
    AllAsFunction extends boolean,
    AllAsChainedFunction extends boolean
> = {
    allProp?: AllProp
    allPropAsFunction?: AllPropAsFunction
    allAsFunction?: AllAsFunction
    allAsChainedFunction?: AllAsChainedFunction
    relativeFile?: boolean | string
}

export const getUnaccessedErrorMessage = (
    allProp: string,
    allPropAsFunction: boolean
) => `
This function's return value cannot be accessed directly.
To use it, you must access a property of the object it returns, e.g.:
    context(...args).prop
or access the entire object via the provided alias, e.g.:
    context(...args).${allProp}${allPropAsFunction ? "()" : ""}
`

export const withCallRange = <
    F extends Func,
    AllProp extends string = "all",
    AllPropAsFunction extends boolean = false,
    AllAsFunction extends boolean = false,
    AllAsChainedFunction extends boolean = false,
    ChainedFunctionResult = unknown
>(
    f: F,
    options?: WithArgsRangeOptions<
        AllProp,
        AllPropAsFunction,
        AllAsFunction,
        AllAsChainedFunction
    >
) => {
    const allProp = options?.allProp ?? "all"
    const allPropAsFunction = options?.allPropAsFunction ?? false
    const allAsFunction = options?.allAsFunction ?? false
    const allAsChainedFunction = options?.allAsChainedFunction ?? false
    const relativeFile = options?.relativeFile ?? false
    const startArgsRange = (...args: any[]) => {
        const {
            file: fromFile,
            method: fromMethod,
            ...from
        } = caller({ relativeFile })
        const endArgsRange = () => {
            const { file, method, ...to } = callsAgo(2, {
                relativeFile
            })
            const range: SourceRange = {
                file,
                from,
                to
            }
            return f(range, ...args)
        }
        if (allAsChainedFunction) {
            return (useResult: (result: any) => any) =>
                useResult(endArgsRange())
        }
        if (allAsFunction) {
            return (...args: any[]) => {
                const result = endArgsRange()
                if (typeof result === "function") {
                    // Original F returned another function, pass on the args
                    return result(...args)
                } else {
                    // Original F did not return a function, ignore args
                    return result
                }
            }
        } else {
            return new Proxy(
                {
                    [getUnaccessedErrorMessage(allProp, allPropAsFunction)]:
                        undefined
                },
                {
                    get: (_, prop) => {
                        const result = endArgsRange()
                        if (prop === allProp) {
                            return allPropAsFunction ? () => result : result
                        }
                        return result[prop]
                    }
                }
            )
        }
    }
    return startArgsRange as WithArgsRange<
        F,
        AllProp,
        AllPropAsFunction,
        AllAsFunction,
        AllAsChainedFunction,
        ChainedFunctionResult
    >
}

export type CallerOfOptions = {
    relativeFile?: boolean | string
    upStackBy?: number
    skip?: (position: SourcePosition) => boolean
}

const nonexistentCurrentLine = narrow({
    line: -1,
    char: -1,
    method: "",
    file: ""
})

export const callerOf = (
    methodName: string,
    options: CallerOfOptions = {}
): SourcePosition => {
    let { upStackBy = 0, relativeFile, skip } = options
    let match: SourcePosition | undefined
    while (!match) {
        const location = getCurrentLine({
            method: methodName,
            frames: upStackBy,
            immediate: false
        })
        if (!location || deepEquals(location, nonexistentCurrentLine)) {
            throw new Error(
                `No caller of '${methodName}' matches given options ${stringify(
                    options
                )}.`
            )
        }
        const candidate = {
            file: relativeFile
                ? relative(
                      typeof relativeFile === "boolean"
                          ? process.cwd()
                          : relativeFile,
                      location.file
                  )
                : location.file,
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
) => callerOf("callsAgo", { upStackBy: num, ...options })

export const caller = (options: CallerOfOptions = {}) => callsAgo(2, options)
