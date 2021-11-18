import { createParser } from "../parser.js"
import { validationError } from "../errors.js"
import { Fragment } from "./fragment.js"
import { typeDefProxy } from "../../common.js"
import { Tuple } from "../recursible/tuple.js"

export namespace List {
    export type Definition<Item extends string = string> = `${Item}[]`

    export const type = typeDefProxy as Definition

    export const parse = createParser(
        {
            type,
            parent: () => Fragment.parse,
            matches: (def, ctx) => def.endsWith("[]"),
            components: (def, ctx) => ({
                item: Fragment.parse(def.slice(0, -2), ctx)
            })
        },
        {
            allows: ({ def, components: { item }, ctx }, valueType, opts) => {
                if (Array.isArray(valueType)) {
                    return Tuple.parse(
                        [...Array(valueType.length)].map(() => item),
                        ctx
                    ).allows(valueType, opts)
                }
                return validationError({
                    def,
                    valueType,
                    path: ctx.path
                })
            },
            generate: () => [],
            references: ({ components: { item } }, opts) =>
                item.references(opts)
        }
    )

    export const delegate = parse as any as Definition
}
