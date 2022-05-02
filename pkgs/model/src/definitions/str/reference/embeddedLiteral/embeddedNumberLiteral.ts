import { asNumber, isNumeric, NumericString } from "@re-/tools"
import { typeOf } from "../../../../utils.js"
import {
    typeDefProxy,
    validationError,
    createParser,
    Defer,
    ShallowNode
} from "./internal.js"
import { EmbeddedLiteral } from "./embeddedLiteral.js"

export namespace EmbeddedNumberLiteral {
    export type Definition<Value extends number = number> = NumericString<Value>

    export type Kind = "embeddedNumberLiteral"

    export type Parse<Def extends string> = Def extends NumericString<
        infer Value
    >
        ? ShallowNode<Kind, Value>
        : Defer

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
