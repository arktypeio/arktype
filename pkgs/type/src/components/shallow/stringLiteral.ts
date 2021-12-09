import { typeDefProxy, validationError, createParser } from "./common.js"
import { Fragment } from "./fragment.js"

export namespace StringLiteral {
    export type Definition<Definition extends string = string> =
        Definition extends `${string} ${string}`
            ? `Spaces are not supported in string literal definitions.`
            : `'${Definition}'`

    export const type = typeDefProxy as Definition

    export const parse = createParser(
        {
            type,
            parent: () => Fragment.parse,
            matches: (def) => !!def.match("'.*'")
        },
        {
            allows: ({ def, ctx: { path } }, valueType) =>
                def === valueType
                    ? {}
                    : validationError({ def, valueType, path }),
            generate: ({ def }) => def.slice(1, -1),
            references: ({ def }, { includeBuiltIn }) =>
                includeBuiltIn ? [def] : []
        }
    )

    export const delegate = parse as any as Definition
}
