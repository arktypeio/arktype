import { asNumber, isNumeric, NumericString } from "@re-/tools"
import { typeOf } from "../../../../utils.js"
import { typeDefProxy, validationError, createParser } from "../internal.js"
import { EmbeddedLiteral } from "./embeddedLiteral.js"

export namespace NumberLiteral {
    export type Definition<Value extends number = number> = NumericString<Value>

    export const type = typeDefProxy as Definition

    export const parser = createParser(
        {
            type,
            parent: () => EmbeddedLiteral.parser
        },
        {
            matches: (definition) => isNumeric(definition),
            validate: ({ def, ctx: { path } }, value) => {
                const valueType = typeOf(value)
                return asNumber(def, { assert: true }) === valueType
                    ? {}
                    : validationError({ def, valueType, path })
            },
            generate: ({ def }) => asNumber(def, { assert: true })
        }
    )

    export const delegate = parser as any as Definition
}
