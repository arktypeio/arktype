import { typeOf } from "../../../../utils.js"
import {
    typeDefProxy,
    validationError,
    createParser,
    ungeneratableError
} from "./internal.js"
import { Reference } from "../reference.js"
import { StringLiteral } from "./stringLiteral.js"

export namespace EmbeddedRegexLiteral {
    export type Definition<Expression extends string> =
        Expression extends `${string}/${string}` ? never : `/${Expression}/`

    export const type = typeDefProxy as string

    // Matches a definition enclosed by forward slashes that does not contain any other forward slashes
    export const matcher = /^\/[^\/]*\/$/

    export const matches = (def: any): def is string => matcher.test(def)

    export const valueFrom = (def: string) => def.slice(1, -1)

    export const parser = createParser(
        {
            type,
            parent: () => Reference.parser
        },
        {
            matches,
            validate: ({ def, ctx: { path } }, value) => {
                const valueType = typeOf(value)
                return StringLiteral.matches(valueType) &&
                    new RegExp(valueFrom(def)).test(
                        StringLiteral.valueFrom(valueType)
                    )
                    ? {}
                    : validationError({ def, valueType, path })
            },
            generate: ({ def }) => {
                throw new Error(ungeneratableError(def, "regex"))
            }
        }
    )

    export const delegate = parser as any as string
}
