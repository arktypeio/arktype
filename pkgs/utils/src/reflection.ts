import getCurrentLine from "get-current-line"
import { relative } from "path"
import { Func, Key } from "./common.js"
import { stringify } from "./stringify.js"
import { LinePosition } from "./stringPositions.js"

export type SourcePosition = LinePosition & {
    file: string
    method: string
}

export type SourceRange = { file: string; from: LinePosition; to: LinePosition }

export type WithArgsRange<
    F extends Func<[SourceRange, ...any[]], Func | Record<Key, any>>,
    AllProp extends string,
    AllPropAsFunction extends boolean,
    AllAsFunction extends boolean
> = F extends (range: SourceRange, ...rest: infer Rest) => infer Return
    ? (...args: Rest) => AllAsFunction extends true
          ? Return extends Func
              ? Return
              : () => Return
          : Return & {
                [K in AllProp]: AllPropAsFunction extends true
                    ? () => Return
                    : Return
            }
    : `To add an args range, first parameter must be a SourceRange and the return must be another function or an object.`

export type WithArgsRangeOptions<
    AllProp extends string,
    AllPropAsFunction extends boolean,
    AllAsFunction extends boolean
> = {
    allProp?: AllProp
    allPropAsFunction?: AllPropAsFunction
    allAsFunction?: AllAsFunction
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
    AllAsFunction extends boolean = false
>(
    f: F,
    options?: WithArgsRangeOptions<AllProp, AllPropAsFunction, AllAsFunction>
) => {
    const allProp = options?.allProp ?? "all"
    const allPropAsFunction = options?.allPropAsFunction ?? false
    const allAsFunction = options?.allAsFunction ?? false
    const startArgsRange = (...args: any[]) => {
        const {
            file: fromFile,
            method: fromMethod,
            ...from
        } = caller({ relativeFile: true })
        const endArgsRange = () => {
            const { file, method, ...to } = callsAgo(2, { relativeFile: true })
            const range: SourceRange = {
                file,
                from,
                to
            }
            return f(range, ...args)
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
        AllAsFunction
    >
}

export type CallerOfOptions = {
    relativeFile?: boolean | string
    upStackBy?: number
}

export const callerOf = (
    methodName: string,
    { upStackBy, relativeFile }: CallerOfOptions = {}
): SourcePosition => {
    const { file, line, char, method } = getCurrentLine({
        method: methodName,
        frames: upStackBy ?? 0,
        immediate: false
    })
    return {
        file: relativeFile
            ? relative(
                  typeof relativeFile === "boolean"
                      ? process.cwd()
                      : relativeFile,
                  file
              )
            : file,
        line,
        column: char,
        method
    }
}

export const callsAgo = (
    num: number,
    options: Omit<CallerOfOptions, "upStackBy"> = {}
) => callerOf("callsAgo", { upStackBy: num, ...options })

export const caller = (options: CallerOfOptions = {}) => callsAgo(2, options)
