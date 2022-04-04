import {
    typeDefProxy,
    validationError,
    createParser,
    UnknownTypeError,
    TypeOfContext,
    ParseTypeContext
} from "./internal.js"
import { Fragment } from "../fragment.js"
import { Expression } from "./expression.js"
import { Tuple } from "../../../obj/index.js"
import { Evaluate } from "@re-/tools"
import { typeOf } from "../../../../utils.js"

export namespace List {
    export type Definition<Of extends string = string> = `${Of}[]`

    export type Parse<
        Def extends Definition,
        Resolutions,
        Context extends ParseTypeContext
    > = Def extends Definition<infer Of>
        ? { list: Fragment.Parse<Of, Resolutions, Context> }
        : UnknownTypeError<Def>

    export type Node = {
        list: Fragment.Node
    }

    export type TypeOf<
        N extends Node,
        Resolutions,
        Options extends TypeOfContext<Resolutions>
    > = Evaluate<Fragment.TypeOf<N["list"], Resolutions, Options>[]>

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
            validate: ({ def, components: { item }, ctx }, value, opts) => {
                if (Array.isArray(value)) {
                    return Tuple.parse(
                        [...Array(value.length)].map(() => item.def),
                        ctx
                    ).validate(value, opts)
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

    export const delegate = parse as any as Definition
}
