import { isNumeric } from "@re-/tools"
import { typeDefProxy, validationError, createParser } from "./internal.js"
import { Builtin } from "./builtin.js"

export namespace BigintLiteral {
    export type Definition<Value extends bigint = bigint> = `${Value}n`

    export const type = typeDefProxy as Definition
    export const parse = createParser(
        {
            type,
            parent: () => Builtin.parse
        },
        {
            matches: (definition) =>
                definition.endsWith("n") && isNumeric(definition.slice(0, -1)),
            validate: ({ def, ctx: { path } }, valueType) =>
                // bigint literals lose the "n" suffix when used in template strings
                typeof valueType === "bigint" && def === `${valueType}n`
                    ? {}
                    : validationError({ def, valueType, path }),
            generate: ({ def }) => BigInt(def.slice(0, -1))
        }
    )

    export const delegate = parse as any as Definition
}
