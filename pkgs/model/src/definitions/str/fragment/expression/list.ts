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

export namespace List {
    export type Definition<Of extends string = string> = `${Of}[]`

    export type Parse<
        Def extends Definition,
        Space,
        Context extends ParseTypeContext
    > = Def extends Definition<infer Of>
        ? { list: Fragment.Parse<Of, Space, Context> }
        : UnknownTypeError<Def>

    export type Node = {
        list: Fragment.Node
    }

    export type TypeOf<
        N extends Node,
        Space,
        Options extends TypeOfContext<Space>
    > = Evaluate<Fragment.TypeOf<N["list"], Space, Options>[]>

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
            generate: () => [],
            references: ({ components }) => components.item.references()
        }
    )

    export const delegate = parse as any as Definition
}
