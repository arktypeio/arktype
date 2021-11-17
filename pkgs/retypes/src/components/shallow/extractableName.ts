import { createParser } from "../parser.js"
import { BuiltIn } from "./builtIn.js"
import { typeDefProxy } from "../../common.js"
import { validationError } from "../errors.js"

// These are the non-literal types we can extract from a value at runtime
export namespace ExtractableName {
    export type Definition<Def extends keyof Defaults = keyof Defaults> = Def

    export const type = typeDefProxy as Definition

    export const parse = createParser(
        {
            type,
            parent: () => BuiltIn.parse,
            matches: (definition) => definition in defaults
        },
        {
            allows: ({ def, ctx: { path } }, valueType) =>
                def === valueType
                    ? {}
                    : validationError({ def, valueType, path })
        }
    )

    export const delegate = parse as any as Definition

    export const defaults = {
        bigint: BigInt(0),
        true: true as true,
        false: false as false,
        null: null,
        symbol: Symbol(),
        undefined: undefined,
        function: (...args: any[]) => undefined as any
    }

    export type Defaults = typeof defaults
}
