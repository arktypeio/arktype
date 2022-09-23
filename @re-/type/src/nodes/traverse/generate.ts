import type { TraverseContext } from "./traverse.js"
import { createTraverseContext } from "./traverse.js"

export type GenerateArgs = {
    cfg: GenerateOptions
    context: TraverseContext<GenerateOptions>
}

export type GenerateOptions = {
    /*
     * By default, generate will throw if it encounters a cyclic required type
     * If this options is provided, it will return its value instead
     */
    onRequiredCycle?: any
    verbose?: boolean
}

export const createGenerateArgs = (
    options: GenerateOptions = {},
    modelOptions: GenerateOptions = {}
): GenerateArgs => ({
    context: createTraverseContext(modelOptions),
    cfg: options
})

export class UngeneratableError extends Error {
    constructor(def: string, reason: string) {
        super(buildUngeneratableMessage(def, reason))
    }
}

export const buildUngeneratableMessage = (def: string, reason: string) =>
    `Unable to generate a value for '${def}': ${reason}`

export class RequiredCycleError extends UngeneratableError {
    constructor(def: string, seen: string[]) {
        super(
            def,
            `Definition includes a required cycle:\n${[...seen, def].join(
                "=>"
            )}\n` +
                `If you'd like to avoid throwing when this occurs, pass a value to return ` +
                `when this occurs to the 'onRequiredCycle' option.`
        )
    }
}
