import { Component } from "../component.js"
import { validationError, unassignableError } from "../errors.js"
import { Fragment } from "./index.js"

export type Definition<Definition extends string = string> =
    Definition extends `${string} ${string}`
        ? `Spaces are not supported in string literal definitions.`
        : `'${Definition}'`

export const stringLiteral: Component<Fragment.Definition, Definition> = {
    matches: ({ definition }) => !!definition.match("'.*'"),
    allowsAssignment: (args) =>
        args.definition === args.from
            ? {}
            : validationError(unassignableError(args), args.path),
    getDefault: ({ definition }) => definition.slice(1, -1),
    extractReferences: ({ definition, includeBuiltIn }) =>
        includeBuiltIn ? [definition] : []
}
