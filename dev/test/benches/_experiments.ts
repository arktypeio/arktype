import type { validateDefinition } from "../../../src/parse/definition.js"
import type { Ark } from "../../../src/scopes/ark.js"

export type FunctionParser<$> = {
    <params>(
        // @ts-expect-error constraining params to an array breaks inference
        ...params: { [i in keyof params]: validateDefinition<params[i], $> }
    ): // @ts-expect-error constraining params to an array breaks inference
    <implementation extends (...args: params) => returns, returns>(
        implementation: implementation
    ) => implementation
}

declare const fn: FunctionParser<Ark>

// could allow something like `fn("string", ":", "boolean")` to specify return type
const z = fn("string", "number")((s, n) => `${n}` === s)
