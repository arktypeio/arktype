import { ParseTypeRecurseOptions, UnvalidatedTypeSet } from "../common.js"
import { createNode, NodeInput, createParser } from "../parser.js"
import { unassignableError, validationError } from "../errors.js"
import { Fragment } from "./fragment.js"
import { typeDefProxy } from "../../common.js"

export namespace List {
    export type Definition<Item extends string = string> = `${Item}[]`

    export const type = typeDefProxy as Definition

    export const node = createNode({
        type,
        parent: () => Fragment.node,
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

    export const parser = createParser(node)
}
