import { Component } from "../component.js"
import { validationError, unassignableError } from "../errors.js"
import { Shallow } from "./index.js"

export type Definition<Value extends number = number> = Value

export const num: Component<Shallow.Definition, Definition> = {
    matches: ({ definition }) => typeof definition === "number",
    allowsAssignment: (args) =>
        args.definition === args.from
            ? {}
            : validationError(unassignableError(args), args.path),
    getDefault: ({ definition }) => definition,
    extractReferences: ({ definition, includeBuiltIn }) =>
        includeBuiltIn ? [definition] : []
}
