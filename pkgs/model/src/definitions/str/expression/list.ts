import { Evaluate, Get } from "@re-/tools"
import { typeDefProxy, validationError, createParser } from "./internal.js"
import { Str } from "../str.js"
import { Expression } from "./expression.js"
import { Tuple } from "../../obj/index.js"
import { typeOf } from "../../../utils.js"

export namespace List {
    export type Definition<Child extends string = string> = `${Child}[]`

    export const type = typeDefProxy as Definition

    export const parser = createParser(
        {
            type,
            parent: () => Expression.parser,
            components: (def, ctx) => ({
                item: Str.parser.parse(def.slice(0, -2), ctx)
            })
        },
        {
            matches: (def, ctx) => def.endsWith("[]"),
            validate: ({ def, components: { item }, ctx }, value, opts) => {
                if (Array.isArray(value)) {
                    return Tuple.parser
                        .parse(
                            [...Array(value.length)].map(() => item.def),
                            ctx
                        )
                        .validate(value, opts)
                }
                return validationError({
                    def,
                    valueType: typeOf(value),
                    path: ctx.path
                })
            },
            generate: () => [],
            references: ({ components }) => components.item.references()
        }
    )

    export const delegate = parser as any as Definition
}
