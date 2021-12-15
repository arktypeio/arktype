import {
    typeDefProxy,
    createParser,
    validationError
} from "../expression/internal.js"
import { Shallow } from "../expression/expression.js"

export namespace Num {
    export type Definition<Value extends number = number> = Value

    export const type = typeDefProxy as Definition

    export const parse = createParser(
        {
            type,
            parent: () => Shallow.parse,
            matches: (definition) => typeof definition === "number"
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
