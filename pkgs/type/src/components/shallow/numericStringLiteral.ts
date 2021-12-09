import { asNumber, isNumeric, NumericString } from "@re-do/utils"
import { typeDefProxy, validationError, createParser } from "./common.js"
import { Fragment } from "./fragment.js"

export namespace NumericStringLiteral {
    export type Definition<Value extends number = number> = NumericString<Value>

    export const type = typeDefProxy as Definition

    export const parse = createParser(
        {
            type,
            parent: () => Fragment.parse,
            matches: (definition) => isNumeric(definition)
        },
        {
            allows: ({ def, ctx: { path } }, valueType) =>
                asNumber(def, { assert: true }) === valueType
                    ? {}
                    : validationError({ def, valueType, path }),
            generate: ({ def }) => asNumber(def, { assert: true }),
            references: ({ def }, { includeBuiltIn }) =>
                includeBuiltIn ? [def] : []
        }
    )

    export const delegate = parse as any as Definition
}
