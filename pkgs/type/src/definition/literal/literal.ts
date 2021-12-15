import { typeDefProxy, createParser, validationError } from "./internal.js"
import { Root } from "../root.js"

export namespace Literal {
    type NonStringLiteral = number | bigint | boolean | undefined | null

    export type Definition<Value extends NonStringLiteral = NonStringLiteral> =
        Value

    export const type = typeDefProxy as Definition

    export const parse = createParser(
        {
            type,
            parent: () => Root.parse,
            matches: (definition) =>
                typeof definition === "number" ||
                typeof definition === "boolean" ||
                definition === null ||
                definition === undefined
        },
        {
            allows: ({ def, ctx: { path } }, valueType, opts) =>
                def === valueType
                    ? {}
                    : validationError({ def, valueType, path }),
            generate: ({ def }) => def,
            references: ({ def }, { includeBuiltIn }) =>
                includeBuiltIn ? [`${def}`] : []
        }
    )

    export const delegate = parse as unknown as Definition
}
