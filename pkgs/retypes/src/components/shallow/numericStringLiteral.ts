import { asNumber, NumericString } from "@re-do/utils"
import { component, ComponentInput } from "../component.js"
import { validationError, unassignableError } from "../errors.js"
import { Fragment } from "./index.js"

export namespace NumericStringLiteral {
    export type Definition<Value extends number = number> = NumericString<Value>
}

export const numericStringLiteral = component<
    Fragment.Definition,
    NumericStringLiteral.Definition
>({
    matches: ({ definition }) => typeof definition === "number",
    allows: (args) =>
        asNumber(args.definition, { assert: true }) === args.assignment
            ? {}
            : validationError(args),
    getDefault: ({ definition }) => asNumber(definition, { assert: true }),
    references: ({ definition, includeBuiltIn }) =>
        includeBuiltIn ? [definition] : []
})
