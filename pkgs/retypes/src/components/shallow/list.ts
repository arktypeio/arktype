import { ParseTypeRecurseOptions, UnvalidatedTypeSet } from "../common.js"
import { createParser } from "../parser.js"
import { unassignableError, validationError } from "../errors.js"
import { Fragment } from "./fragment.js"
import { typeDefProxy } from "../../common.js"
import { Tuple } from "../recursible/tuple.js"

export namespace List {
    export type Definition<Item extends string = string> = `${Item}[]`

    export const type = typeDefProxy as Definition

    const parts = (definition: Definition) => ({
        item: definition.slice(0, -2)
    })

    export const parse = createParser({
        type,
        parent: () => Fragment.parse,
        matches: (definition) => definition.endsWith("[]"),
        implements: {
            allows: (definition, context, assignment, opts) => {
                const { item } = parts(definition)
                if (Array.isArray(assignment)) {
                    // Convert the defined list to a tuple of the same length as extracted
                    return Tuple.parse(
                        [...Array(assignment.length)].map(() => item),
                        context
                    ).allows(assignment, opts)
                }
                return validationError({
                    definition,
                    path: context.path,
                    assignment
                })
            },
            generate: () => [],
            references: (definition, context, opts) =>
                Fragment.parse(parts(definition).item, context).references(opts)
        }
    })

    export const delegate = parse as any as Definition
}
