import { Reference } from "./reference/index.js"
import { Expression } from "./expression/index.js"
import { Str } from "../str.js"
import {
    ParseTypeContext,
    ParseConfig,
    createParser,
    typeDefProxy,
    UnknownTypeError
} from "./internal.js"
import { Modification } from "../modification/modification.js"
import {
    invalidModifierError,
    InvalidModifierError,
    ModifierToken,
    unknownTypeError
} from "../internal.js"

export namespace Fragment {
    export type Definition = string

    export type Parse<
        Def extends string,
        Space,
        Context extends ParseTypeContext
    > = Def extends Expression.Definition
        ? Expression.Parse<Def, Space, Context>
        : Def extends `${infer Left}${Context["delimiter"]}${infer Right}`
        ? UnpackArgs<
              [Parse<Left, Space, Context>, Parse<Right, Space, Context>]
          >
        : Def extends Reference.Definition<Space>
        ? Def
        : // If we've made it to this point, Modifications should have already been handled
        Def extends Modification.Definition
        ? InvalidModifierError
        : UnknownTypeError<Def>

    type UnpackArgs<Args> = Args extends [infer First, infer Second]
        ? Second extends any[]
            ? [First, ...Second]
            : Args
        : Args

    export type Node = Expression.Node | Reference.Node

    export type TypeOf<
        N,
        Space,
        Options extends ParseConfig
    > = N extends Reference.Node
        ? Reference.TypeOf<N, Space, Options>
        : N extends Expression.Node
        ? Expression.TypeOf<N, Space, Options>
        : unknown

    export const type = typeDefProxy as Definition

    export const parse = createParser(
        {
            type,
            parent: () => Str.parse,
            children: () => [Reference.delegate, Expression.delegate],
            fallback: (def, { path }) => {
                if (Modification.parse.matches(def as any)) {
                    throw new Error(
                        invalidModifierError(
                            def[def.length - 1] as ModifierToken
                        )
                    )
                }
                throw new Error(unknownTypeError(def, path))
            }
        },
        {
            matches: (def) => typeof def === "string"
        }
    )

    export const delegate = parse as any as Definition
}
