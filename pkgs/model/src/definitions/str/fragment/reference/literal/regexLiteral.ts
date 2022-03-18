import { typeDefProxy, validationError, createParser } from "../internal.js"
import { Reference } from "../reference.js"
import { StringLiteral } from "./stringLiteral.js"

export namespace RegexLiteral {
    export type Definition<Expression extends string = string> =
        `/${Expression}/`

    export const type = typeDefProxy as Definition

    export const matcher = /^\/.*\/$/

    export const matches = (def: any): def is Definition => matcher.test(def)

    export const valueFrom = (def: Definition) => def.slice(1, -1)

    export const parse = createParser(
        {
            type,
            parent: () => Reference.parse
        },
        {
            matches,
            allows: ({ def, ctx: { path } }, valueType) =>
                StringLiteral.matches(valueType) &&
                new RegExp(valueFrom(def)).test(
                    StringLiteral.valueFrom(valueType)
                )
                    ? {}
                    : validationError({ def, valueType, path }),
            // TODO: Add ability to generate a regex
            generate: ({ def }) => ""
        }
    )

    export const delegate = parse as any as Definition
}
