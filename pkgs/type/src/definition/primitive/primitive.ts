import { narrow } from "@re-/utils"
import { typeDefProxy, createParser, validationError } from "./internal.js"
import { Root } from "../root.js"

export namespace Primitive {
    export type Definition = number | bigint | boolean | undefined | null

    export const type = typeDefProxy as Definition

    export const typesOf = narrow(["number", "bigint", "boolean", "undefined"])

    export const parse = createParser(
        {
            type,
            parent: () => Root.parse
        },
        {
            matches: (definition) =>
                typesOf.includes(typeof definition as any) ||
                definition === null,
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
