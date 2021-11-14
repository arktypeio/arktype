import { createParser } from "../parser.js"
import { validationError, unassignableError } from "../errors.js"
import { Fragment } from "./fragment.js"
import { typeDefProxy } from "../../common.js"

export namespace StringLiteral {
    export type Definition<Definition extends string = string> =
        Definition extends `${string} ${string}`
            ? `Spaces are not supported in string literal definitions.`
            : `'${Definition}'`

    export const type = typeDefProxy as Definition

    export const parse = createParser({
        type,
        parent: () => Fragment.parse,
        matches: ({ definition }) => !!definition.match("'.*'"),
        implements: {
            allows: (args) =>
                args.definition === args.assignment
                    ? {}
                    : validationError(args),
            getDefault: ({ definition }) => definition.slice(1, -1),
            references: ({ definition, includeBuiltIn }) =>
                includeBuiltIn ? [definition] : []
        }
    })

    export const parse = createParser(node)
}
