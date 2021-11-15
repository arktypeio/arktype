import { asNumber, NumericString } from "@re-do/utils"
import { createParser } from "../parser.js"
import { validationError, unassignableError } from "../errors.js"
import { Fragment } from "./fragment.js"
import { typeDefProxy } from "../../common.js"

export namespace NumericStringLiteral {
    export type Definition<Value extends number = number> = NumericString<Value>

    export const type = typeDefProxy as Definition

    export const parse = createParser({
        type,
        parent: () => Fragment.parse,
        matches: (definition) => typeof definition === "number",
        implements: {
            allows: (definition, { path }, assignment) =>
                asNumber(definition, { assert: true }) === assignment
                    ? {}
                    : validationError({ definition, assignment, path }),
            getDefault: (definition) => asNumber(definition, { assert: true }),
            references: (definition, context, { includeBuiltIn }) =>
                includeBuiltIn ? [definition] : []
        }
    })

    export const delegate = parse as any as Definition
}
