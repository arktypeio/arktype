import { isInteger } from "@re-/tools"
import { typeOf } from "../../../../utils.js"
import { EmbeddedLiteral } from "./embeddedLiteral.js"
import { createParser, typeDefProxy, validationError } from "./internal.js"

export namespace EmbeddedBigintLiteral {
    export type Definition<Value extends bigint = bigint> = `${Value}n`

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
