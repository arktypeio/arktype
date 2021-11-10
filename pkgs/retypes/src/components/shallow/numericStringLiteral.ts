import { asNumber, NumericString } from "@re-do/utils"
import { createNode, NodeInput } from "../parser.js"
import { validationError, unassignableError } from "../errors.js"
import { fragment, fragmentDef } from "./fragment.js"
import { Fragment } from "./index.js"

export namespace NumericStringLiteral {
    export type Definition<Value extends number = number> = NumericString<Value>
}

export const numericStringLiteral = createNode({
    type: {} as NumericStringLiteral.Definition,
    parent: fragmentDef,
    matches: ({ definition }) => typeof definition === "number",
    implements: {
        allows: (args) =>
            asNumber(args.definition, { assert: true }) === args.assignment
                ? {}
                : validationError(args),
        getDefault: ({ definition }) => asNumber(definition, { assert: true }),
        references: ({ definition, includeBuiltIn }) =>
            includeBuiltIn ? [definition] : []
    }
})
