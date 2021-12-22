import { typeDefProxy, validationError, createParser } from "../internal.js"
import { Builtin } from "./builtin.js"

export namespace StringLiteral {
    export type Definition<Definition extends string = string> =
        Definition extends `${string} ${string}`
            ? `Spaces are not supported in string literal definitions.`
            : `'${Definition}'`

    export const type = typeDefProxy as Definition

    export const parse = createParser(
        {
            type,
            parent: () => Builtin.parse
        },
        {
            matches: (def) => !!def.match("'.*'"),
            validate: ({ def, ctx: { path } }, valueType) =>
                def === valueType
                    ? {}
                    : validationError({ def, valueType, path }),
            generate: ({ def }) => def.slice(1, -1)
        }
    )

    export const delegate = parse as any as Definition
}
