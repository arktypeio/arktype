import { createParser, createNode } from "../parser.js"
import { validationError, unassignableError } from "../errors.js"
import { shallowNode } from "./shallow.js"

export namespace Num {
    export type Definition<Value extends number = number> = Value
}

export const numNode = createNode({
    type: {} as Num.Definition,
    parent: shallowNode,
    matches: ({ definition }) => typeof definition === "number",
    implements: {
        allows: (args) =>
            args.definition === args.assignment ? {} : validationError(args),
        getDefault: ({ definition }) => definition,
        references: ({ definition, includeBuiltIn }) =>
            includeBuiltIn ? [definition] : []
    }
})

export const num = createParser(numNode)
