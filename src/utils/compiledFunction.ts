import { throwInternalError } from "./errors.js"

export const CompiledFunction = class extends Function {
    constructor(...args: string[]) {
        try {
            super(...args)
        } catch (e) {
            return throwInternalError(
                `Encountered an unexpected error during validation:
                Message: ${e} 
                Source: (${args.slice(0, -1)}) => {
                    ${args.at(-1)}
                }`
            )
        }
    }
} as CompiledFunction

export type CompiledFunction = new <f extends (...args: any[]) => unknown>(
    ...args: ConstructorParameters<typeof Function>
) => f & {
    apply(thisArg: null, args: Parameters<f>): ReturnType<f>

    call(thisArg: null, ...args: Parameters<f>): ReturnType<f>
}
