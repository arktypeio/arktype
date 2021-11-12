import { createParser, createNode } from "../parser.js"
import { validationError, unassignableError } from "../errors.js"
import { Shallow } from "./shallow.js"
import { typeDefProxy } from "../../common.js"

export namespace Num {
    export type Definition<Value extends number = number> = Value

    export const type = typeDefProxy as Definition

    export const node = createNode({
        type,
        parent: () => Shallow.node,
        matches: ({ definition }) => typeof definition === "number",
        implements: {
            allows: (args) =>
                args.definition === args.assignment
                    ? {}
                    : validationError(args),
            getDefault: ({ definition }) => definition,
            references: ({ definition, includeBuiltIn }) =>
                includeBuiltIn ? [definition] : []
        }
    })

    export const parser = createParser(node)
}
