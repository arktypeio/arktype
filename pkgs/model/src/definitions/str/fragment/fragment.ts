import { GetAs } from "@re-/tools"
import { Reference } from "./reference/index.js"
import { Expression } from "./expression/index.js"
import { Str } from "../str.js"
import { createParser, typeDefProxy, UnknownTypeError } from "./internal.js"
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
        Resolutions,
        Context
    > = Reference.Matches<Def, Resolutions> extends true
        ? Def
        : Def extends Expression.Definition
        ? Expression.Parse<Def, Resolutions, Context>
        : Def extends `${infer Left}${GetAs<
              Context,
              "delimiter",
              string
          >}${infer Right}`
        ? UnpackArgs<
              [
                  Parse<Left, Resolutions, Context>,
                  Parse<Right, Resolutions, Context>
              ]
          >
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

    export type TypeOf<N, Resolutions, Options> = N extends Expression.Node
        ? Expression.TypeOf<N, Resolutions, Options>
        : N extends Reference.Node
        ? Reference.TypeOf<N, Resolutions, Options>
        : unknown

    export const type = typeDefProxy as Definition

    export const parser = createParser(
        {
            type,
            parent: () => Str.parser,
            children: () => [Reference.delegate, Expression.delegate],
            fallback: (def, { path }) => {
                if (Modification.parser.matches(def as any)) {
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

    export const delegate = parser as any as Definition
}
