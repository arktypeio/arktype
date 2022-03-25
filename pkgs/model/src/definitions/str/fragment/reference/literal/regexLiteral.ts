import {
    typeDefProxy,
    validationError,
    createParser,
    ungeneratableError
} from "../internal.js"
import { Reference } from "../reference.js"
import { FirstEnclosed } from "./internal.js"
import { StringLiteral } from "./stringLiteral.js"

export namespace RegexLiteral {
    export type Definition<Expression extends string = string> =
        `/${Expression}/`

    export type Matches<Def extends string> = Def extends `/${FirstEnclosed<
        Def,
        `/`
    >}/`
        ? true
        : false

    export const type = typeDefProxy as Definition

    // Matches a definition enclosed by forward slashes that does not contain any other forward slashes
    export const matcher = /^\/[^\/]*\/$/

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
            generate: ({ def }) => {
                throw new Error(ungeneratableError(def, "regex"))
            }
        }
    )

    export const delegate = parse as any as Definition
}
