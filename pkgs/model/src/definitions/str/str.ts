import { Evaluate, GetAs } from "@re-/tools"
import { Reference } from "./reference/index.js"
import { Expression } from "./expression/index.js"
import {
    invalidModifierError,
    InvalidModifierError,
    ModifierToken,
    unknownTypeError,
    createParser,
    typeDefProxy,
    UnknownTypeError,
    Precedence,
    Defer,
    Root,
    ErrorNode,
    DefaultParseTypeContext
} from "./internal.js"
import { Optional } from "./optional.js"

export namespace Str {
    export type ParseRoot<Def, Resolutions, Context> = Def extends string
        ? Precedence<
              [
                  Optional.Parse<Def, Resolutions, Context>,
                  Parse<Def, Resolutions, Context>,
                  ErrorNode<UnknownTypeError<Def>>
              ]
          >
        : Defer

    export type Parse<Def extends string, Resolutions, Context> = Precedence<
        [
            Reference.Parse<Def, Resolutions, Context>,
            Expression.Parse<Def, Resolutions, Context>,
            Def extends `${infer Left}${GetAs<
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
                : Defer,
            ErrorNode<
                Def extends Optional.Definition
                    ? InvalidModifierError
                    : UnknownTypeError<Def>
            >
        ]
    >

    type UnpackArgs<Args> = Args extends [infer First, infer Second]
        ? Second extends any[]
            ? [First, ...Second]
            : Args
        : Args

    export const type = typeDefProxy as string

    export const parser = createParser(
        {
            type,
            parent: () => Root.parser,
            children: () => [
                Optional.delegate,
                Reference.delegate,
                Expression.delegate
            ],
            fallback: (def, { path }) => {
                if (Optional.parser.matches(def as any)) {
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

    export const delegate = parser as any as string
}
