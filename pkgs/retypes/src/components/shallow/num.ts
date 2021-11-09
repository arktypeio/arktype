import { ComponentInput } from "../component.js"
import { validationError, unassignableError } from "../errors.js"
import { Shallow } from "./index.js"

export namespace Num {
    export type Definition<Value extends number = number> = Value
}

export const num: ComponentInput<Shallow.Definition, Num.Definition> = {
    matches: ({ definition }) => typeof definition === "number",
    allows: (args) =>
        args.definition === args.assignment
            ? {}
            : validationError(unassignableError(args), args.path),
    getDefault: ({ definition }) => definition,
    references: ({ definition, includeBuiltIn }) =>
        includeBuiltIn ? [definition] : []
}
