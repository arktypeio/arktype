import { isInteger } from "@re-/tools"
import { typeOf } from "../../../../utils.js"
import {
    typeDefProxy,
    validationError,
    createParser,
    Defer,
    ShallowNode
} from "./internal.js"
import { EmbeddedLiteral } from "./embeddedLiteral.js"

export namespace EmbeddedBigintLiteral {
    export type Definition<Value extends bigint = bigint> = `${Value}n`

    export type Kind = "embeddedBigintLiteral"

    export type Parse<Def extends string> = Def extends Definition<infer Value>
        ? ShallowNode<Kind, Value>
        : Defer

    export const type = typeDefProxy as Definition
    export const parser = createParser(
        {
            type,
            parent: () => EmbeddedLiteral.parser
        },
        {
            matches: (definition) =>
                definition.endsWith("n") && isInteger(definition.slice(0, -1)),
            validate: ({ def, ctx: { path } }, value) => {
                const valueType = typeOf(value)
                // bigint literals lose the "n" suffix when used in template strings
                return typeof valueType === "bigint" && def === `${valueType}n`
                    ? {}
                    : validationError({ def, valueType, path })
            },
            generate: ({ def }) => BigInt(def.slice(0, -1))
        }
    )

    export const delegate = parser as any as Definition
}
