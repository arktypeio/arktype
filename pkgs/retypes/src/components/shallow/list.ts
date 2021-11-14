import { ParseTypeRecurseOptions, UnvalidatedTypeSet } from "../common.js"
import { createParser } from "../parser.js"
import { unassignableError, validationError } from "../errors.js"
import { Fragment } from "./fragment.js"
import { typeDefProxy } from "../../common.js"
import { Tuple } from "../recursible/tuple.js"

export namespace List {
    export type Definition<Item extends string = string> = `${Item}[]`

    export const type = typeDefProxy as Definition

    export const parse = createParser({
        type,
        parent: () => Fragment.parse,
        matches: (definition) => definition.endsWith("[]"),
        parse: (definition) => ({})
    })

    export const delegate = parse as any as Definition
}
