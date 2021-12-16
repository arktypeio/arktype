import { asNumber, isNumeric, NumericString } from "@re-/utils"
import { typeDefProxy, validationError, createParser } from "./internal.js"
import { Fragment } from "../fragment.js"

export namespace NumberLiteral {
    export type Definition<Value extends number = number> = NumericString<Value>

    export const type = typeDefProxy as Definition

    export const parse = createParser(
        {
            type,
            parent: () => Fragment.parse
        },
        {
            allows: ({ def, ctx: { path } }, valueType) =>
                asNumber(def, { assert: true }) === valueType
                    ? {}
                    : validationError({ def, valueType, path }),
            generate: ({ def }) => asNumber(def, { assert: true }),
            references: ({ def }, { includeBuiltIn }) =>
                includeBuiltIn ? [def] : [],
            matches: (definition) => isNumeric(definition)
        }
    )

    export const delegate = parse as any as Definition
}
