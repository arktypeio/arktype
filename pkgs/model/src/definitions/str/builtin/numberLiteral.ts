import { asNumber, isNumeric, NumericString } from "@re-/tools"
import { typeDefProxy, validationError, createParser } from "./internal.js"
import { Builtin } from "./builtin.js"

export namespace NumberLiteral {
    export type Definition<Value extends number = number> = NumericString<Value>

    export const type = typeDefProxy as Definition

    export const parse = createParser(
        {
            type,
            parent: () => Builtin.parse
        },
        {
            matches: (definition) => isNumeric(definition),
            validate: ({ def, ctx: { path } }, valueType) =>
                asNumber(def, { assert: true }) === valueType
                    ? {}
                    : validationError({ def, valueType, path }),
            generate: ({ def }) => asNumber(def, { assert: true })
        }
    )

    export const delegate = parse as any as Definition
}
