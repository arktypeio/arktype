import { asNumber, NumericString } from "@re-do/utils"
import { createNode, createParser, NodeInput } from "../parser.js"
import { validationError, unassignableError } from "../errors.js"
import { Fragment } from "./index.js"
import { typeDefProxy } from "../../common.js"

export namespace NumericStringLiteral {
    export type Definition<Value extends number = number> = NumericString<Value>

    export const type = typeDefProxy as Definition

    export const node = createNode({
        type,
        parent: Fragment.node,
        matches: ({ definition }) => typeof definition === "number",
        implements: {
            allows: (args) =>
                asNumber(args.definition, { assert: true }) === args.assignment
                    ? {}
                    : validationError(args),
            getDefault: ({ definition }) =>
                asNumber(definition, { assert: true }),
            references: ({ definition, includeBuiltIn }) =>
                includeBuiltIn ? [definition] : []
        }
    })

    export const parser = createParser(node)
}
