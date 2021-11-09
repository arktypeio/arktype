import { Component } from "../component.js"
import { validationError, unassignableError } from "../errors.js"
import { Fragment } from "./index.js"

export namespace StringLiteral {
    export type Definition<Definition extends string = string> =
        Definition extends `${string} ${string}`
            ? `Spaces are not supported in string literal definitions.`
            : `'${Definition}'`
}

export const stringLiteral: Component<
    Fragment.Definition,
    StringLiteral.Definition
> = {
    matches: ({ definition }) => !!definition.match("'.*'"),
    allows: (args) =>
        args.definition === args.assignment
            ? {}
            : validationError(unassignableError(args), args.path),
    getDefault: ({ definition }) => definition.slice(1, -1),
    references: ({ definition, includeBuiltIn }) =>
        includeBuiltIn ? [definition] : []
}
