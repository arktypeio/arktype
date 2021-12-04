import {
    LinePosition,
    Func,
    Key,
    toString,
    withDefaults,
    WithDefaults
} from "@re-do/utils"
import { fileName } from "./fs.js"
import { caller, getRelativeFilePath, SourcePosition } from "./caller.js"

export type WithPositionOptions = {
    relative?: boolean | string
}

export type WithCallPosition<
    F extends Func<[position: SourcePosition, ...args: any[]]>
> = F extends (position: SourcePosition, ...args: infer Args) => infer Return
    ? (...args: Args) => Return
    : never

export const withCallPosition = <
    F extends Func<[position: SourcePosition, ...args: any[]]>,
    Options extends WithPositionOptions
>(
    f: F,
    options?: Options
) => {
    const { relative } = options ?? {}
    const skip = ({ file }: SourcePosition) =>
        file === getRelativeFilePath(fileName(), relative)
    const forwardCaller = ((...args: any[]) =>
        f(
            caller({
                relative,
                skip
            }),
            ...args
        )) as WithCallPosition<F>
    return forwardCaller
}

export type SourceRange = { file: string; from: LinePosition; to: LinePosition }

export type ForwardCallbackReturn<F extends Func> = (
    callback: F
) => ReturnType<F>

export type WithArgsRange<
    F extends Func<[SourceRange, ...any[]], Func | Record<Key, any>>,
    Options extends Required<WithRangeOptions>
> = F extends (range: SourceRange, ...rest: infer Rest) => infer Return
    ? (...args: Rest) => Return extends Func
          ? Return
          : Return &
                (Options["allCallback"] extends true
                    ? ForwardCallbackReturn<(returned: Return) => unknown>
                    : () => Return) &
                (Options["allProp"]["name"] extends ""
                    ? {}
                    : {
                          [K in Options["allProp"]["name"]]: Options["allProp"]["asThunk"] extends true
                              ? () => Return
                              : Return
                      })
    : `To add an args range, first parameter must be a SourceRange and the return must be another function or an object.`

export type AllPropOptions = {
    name: string
    asThunk?: boolean
}

export type WithRangeOptions = {
    allProp?: AllPropOptions
    allCallback?: boolean
    relative?: boolean | string
}

export const withCallRange = <
    F extends Func,
    Options extends WithRangeOptions,
    CompiledOptions extends Required<WithRangeOptions> = WithDefaults<
        WithRangeOptions,
        Options,
        {
            allProp: { name: "" }
            allCallback: false
            relative: false
        }
    >
>(
    f: F,
    options?: Options
) => {
    const { allCallback, relative, allProp } = withDefaults<WithRangeOptions>({
        allProp: { name: "", asThunk: false },
        allCallback: false,
        relative: false
    })(options) as CompiledOptions
    const skip = ({ file }: SourcePosition) =>
        file === getRelativeFilePath(fileName(), relative)
    const startArgsRange = (...args: any[]) => {
        const startCaller = caller({
            relative,
            skip
        })
        const { file: fromFile, method: fromMethod, ...from } = startCaller
        let range: SourceRange
        const endArgsRange = () => {
            if (!range) {
                const endCaller = caller({
                    relative,
                    skip
                })
                const { file, method, ...to } = endCaller
                if (
                    file !== fromFile ||
                    from.line > to.line ||
                    (from.line === to.line && from.column > to.column)
                ) {
                    throw new Error(
                        `Unable to determine a source range for non-subsequent calls:\n` +
                            `From: ${toString(startCaller)}\nTo: ${toString(
                                endCaller
                            )}\n`
                    )
                }
                range = {
                    file,
                    from,
                    to
                }
            }
            return f(range, ...args)
        }
        let onCall
        if (allCallback) {
            onCall = (useResult: (result: any) => any) =>
                useResult(endArgsRange())
        } else {
            onCall = (...argsForReturnedFunc: any[]) => {
                const returned = endArgsRange()
                if (typeof returned === "function") {
                    // If f returned another function, call it with the provided args
                    return returned(...argsForReturnedFunc)
                }
                // Otherwise, args passed to onCall will be ignored
                return returned
            }
        }
        return new Proxy(onCall, {
            get: (_, prop) => {
                const result = endArgsRange()
                if (allProp.name && prop === allProp.name) {
                    return allProp.asThunk ? () => result : result
                }
                return result[prop]
            }
        })
    }
    return startArgsRange as WithArgsRange<F, CompiledOptions>
}
