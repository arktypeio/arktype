import { component, ComponentInput } from "../component.js"
import { validationError, unassignableError } from "../errors.js"
import { fragment } from "./fragment.js"
import { Fragment } from "./index.js"

export namespace StringLiteral {
    export type Definition<Definition extends string = string> =
        Definition extends `${string} ${string}`
            ? `Spaces are not supported in string literal definitions.`
            : `'${Definition}'`
}

export const stringLiteral = component({
    name: "stringLiteral",
    def: {} as StringLiteral.Definition,
    parent: fragment,
    matches: ({ definition }) => !!definition.match("'.*'"),
    allows: (args) =>
        args.definition === args.assignment ? {} : validationError(args),
    getDefault: ({ definition }) => definition.slice(1, -1),
    references: ({ definition, includeBuiltIn }) =>
        includeBuiltIn ? [definition] : []
})
