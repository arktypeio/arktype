import { typeDefProxy, validationError, createParser } from "./internal.js"
import { Fragment } from "../fragment.js"
import { Expression } from "./expression.js"
import { Tuple } from "../../obj/index.js"

export namespace List {
    export type Definition<Item extends string = string> = `${Item}[]`

    export const type = typeDefProxy as Definition

    export const parse = createParser(
        {
            type,
            parent: () => Expression.parse,
            components: (def, ctx) => ({
                item: Fragment.parse(def.slice(0, -2), ctx)
            })
        },
        {
            matches: (def, ctx) => def.endsWith("[]"),
            allows: ({ def, components: { item }, ctx }, valueType, opts) => {
                if (Array.isArray(valueType)) {
                    return Tuple.parse(
                        [...Array(valueType.length)].map(() => item.def),
                        ctx
                    ).allows(valueType, opts)
                }
                return validationError({
                    def,
                    valueType,
                    path: ctx.path
                })
            },
            generate: () => []
        }
    )

    export const delegate = parse as any as Definition
}
