import { throwInternalError } from "./errors.js"

export const cached = <T>(thunk: () => T) => {
    let isCached = false
    let result: T | undefined
    return () => {
        if (!isCached) {
            result = thunk()
            isCached = true
        }
        return result as T
    }
}

export const isThunk = (def: unknown): def is () => unknown =>
    typeof def === "function" && def.length === 0

export const CompiledFunction = class extends Function {
    constructor(...args: [string, ...string[]]) {
        const params = args.slice(0, -1)
        const body = args.at(-1)!
        try {
            super(...params, body)
        } catch (e) {
            return throwInternalError(
                `Encountered an unexpected error while compiling your definition:
                Message: ${e} 
                Source: (${args.slice(0, -1)}) => {
                    ${args.at(-1)}
                }`
            )
        }
    }
} as CompiledFunction

export type CompiledFunction = new <f extends (...args: never[]) => unknown>(
    ...args: ConstructorParameters<typeof Function>
) => f & {
    apply(thisArg: null, args: Parameters<f>): ReturnType<f>

    call(thisArg: null, ...args: Parameters<f>): ReturnType<f>
}
