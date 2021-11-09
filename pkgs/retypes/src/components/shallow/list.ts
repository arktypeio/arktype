import { ParseTypeRecurseOptions, UnvalidatedTypeSet } from "../common.js"
import { Component } from "../component.js"
import { unassignableError, validationError } from "../errors.js"
import { Fragment } from "./index.js"

export namespace List {
    export type Definition<Item extends string = string> = `${Item}[]`
}

export const list: Component<Fragment.Definition, List.Definition> = {
    matches: ({ definition }) => definition.endsWith("[]"),
    children: []
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
}
