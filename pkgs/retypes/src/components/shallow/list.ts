import { ParseTypeRecurseOptions, UnvalidatedTypeSet } from "../common.js"
import { createNode, NodeInput, createNode } from "../parser.js"
import { unassignableError, validationError } from "../errors.js"
import { fragmentDef } from "./fragment.js"
import { Fragment } from "./index.js"

export namespace List {
    export type Definition<Item extends string = string> = `${Item}[]`
}

export const listDef = createNode({
    type: {} as List.Definition,
    parent: fragmentDef,
    matches: ({ definition }) => definition.endsWith("[]")
    // allowsAssignment: (args) => {
    //     const listItemDefinition = args.definition.slice(0, -2)
    //     if (Array.isArray(args.from)) {
    //         // Convert the defined list to a tuple of the same length as extracted
    //         return tuple.allowsAssignment({
    //             ...args,
    //             defined: [...Array(args.from.length)].map(
    //                 () => listItemDefinition
    //             )
    //         })
    //     }
    //     return validationError(unassignableError(args), args.path)
    // }
})

export const list = createNode(listDef)
