import { isInteger } from "@re-/tools"
import { typeOf } from "../../../../../utils.js"
import { typeDefProxy, validationError, createParser } from "./internal.js"
import { Literal } from "./literal.js"

export namespace BigintLiteral {
    export type Definition<Value extends bigint = bigint> = `${Value}n`

    export const type = typeDefProxy as Definition
    export const parse = createParser(
        {
            type,
            parent: () => Literal.parse
        },
        {
            matches: (definition) =>
                definition.endsWith("n") && isInteger(definition.slice(0, -1)),
            allows: ({ def, ctx: { path } }, value) => {
                const valueType = typeOf(value)
                // bigint literals lose the "n" suffix when used in template strings
                return typeof valueType === "bigint" && def === `${valueType}n`
                    ? {}
                    : validationError({ def, valueType, path })
            },
            generate: ({ def }) => BigInt(def.slice(0, -1))
        }
    )

    export const delegate = parse as any as Definition
}
