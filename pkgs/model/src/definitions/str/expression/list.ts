import { Evaluate } from "@re-/tools"
import {
    typeDefProxy,
    validationError,
    createParser,
    UnknownTypeError
} from "./internal.js"
import { Fragment } from "../fragment.js"
import { Expression } from "./expression.js"
import { Tuple } from "../../obj/index.js"
import { typeOf } from "../../../utils.js"

export namespace List {
    export type Definition<Of extends string = string> = `${Of}[]`

    export type Parse<
        Def extends Definition,
        Resolutions,
        Context
    > = Def extends Definition<infer Of>
        ? { list: Fragment.Parse<Of, Resolutions, Context> }
        : UnknownTypeError<Def>

    export type Node = {
        list: any
    }

    export type TypeOf<N extends Node, Resolutions, Options> = Evaluate<
        Fragment.TypeOf<N["list"], Resolutions, Options>[]
    >

    export const type = typeDefProxy as Definition

    export const parser = createParser(
        {
            type,
            parent: () => Expression.parser,
            components: (def, ctx) => ({
                item: Fragment.parser.parse(def.slice(0, -2), ctx)
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
