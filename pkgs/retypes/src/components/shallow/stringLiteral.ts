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
        matches: (definition) => !!definition.match("'.*'"),
        implements: {
            allows: (definition, { path }, assignment) =>
                definition === assignment
                    ? {}
                    : validationError({ definition, assignment, path }),
            getDefault: (definition) => definition.slice(1, -1),
            references: (definition, context, { includeBuiltIn }) =>
                includeBuiltIn ? [definition] : []
        }
    })

    export const delegate = parse as any as Definition
}
