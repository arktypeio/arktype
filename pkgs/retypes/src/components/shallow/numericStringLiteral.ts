import { asNumber, NumericString } from "@re-do/utils"
import { Component } from "../component.js"
import { validationError, unassignableError } from "../errors.js"
import { Fragment } from "./index.js"

export type Definition<Value extends number = number> = NumericString<Value>

export const numericStringLiteral: Component<Fragment.Definition, Definition> =
    {
        matches: ({ definition }) => typeof definition === "number",
        allowsAssignment: (args) =>
            asNumber(args.definition, { assert: true }) === args.from
                ? {}
                : validationError(unassignableError(args), args.path),
        getDefault: ({ definition }) => asNumber(definition, { assert: true }),
        extractReferences: ({ definition, includeBuiltIn }) =>
            includeBuiltIn ? [definition] : []
    }
