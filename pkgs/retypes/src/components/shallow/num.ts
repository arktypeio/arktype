import { createParser } from "../parser.js"
import { validationError, unassignableError } from "../errors.js"
import { Shallow } from "./shallow.js"
import { typeDefProxy } from "../../common.js"

export namespace Num {
    export type Definition<Value extends number = number> = Value

    export const type = typeDefProxy as Definition

    export const parse = createParser({
        type,
        parent: () => Shallow.parse,
        matches: (definition) => typeof definition === "number",
        implements: {
            allows: (definition, { path }, assignment) =>
                definition === assignment
                    ? {}
                    : validationError({ definition, assignment, path }),
            generate: (definition) => definition,
            references: (definition, context, { includeBuiltIn }) =>
                includeBuiltIn ? [definition] : []
        }
    })

    export const delegate = parse as unknown as Definition
}
