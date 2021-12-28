import { IncludesSubstring } from "@re-/tools"
import {
    ParseConfig,
    createParser,
    typeDefProxy,
    UnknownTypeError,
    ModifierToken,
    InvalidModifierError,
    ModifierString,
    modifierTokenMatcher
} from "./internal.js"
import { Str } from "../str.js"
import { Optional } from "./optional.js"
import { Constraints } from "./constraint.js"
import { Fragment } from "../fragment.js"

export namespace Modification {
    export type Definition<
        TypeDef extends string = string,
        Modifiers extends ModifierString = ModifierString,
        Constraints extends string = string
    > = `${TypeDef}${Modifiers}${Constraints}`

    export type Check<
        Def extends string,
        Root extends string,
        Space,
        Unavailable extends ModifierToken = never
    > = Def extends Definition<
        infer TypeDef,
        infer Modifiers,
        infer Constraints
    >
        ? IncludesSubstring<Modifiers, Unavailable> extends true
            ? InvalidModifierError<Unavailable>
            : Def extends Constraints.Definition<
                  infer TypeDef,
                  infer Constraints
              >
            ? Modification.Check<TypeDef, Root, Space, Unavailable | ":">
            : Def extends Optional.Definition<infer Inner>
            ? Modification.Check<Inner, Root, Space, Unavailable | ":" | "?">
            : UnknownTypeError<Def>
        : Fragment.Check<Def, Root, Space>

    export type Parse<
        Def extends string,
        Space,
        Options extends ParseConfig
    > = Def extends Definition<
        infer TypeDef,
        infer Modifiers,
        infer Constraints
    >
        ? IncludesSubstring<Modifiers, "?"> extends true
            ? Fragment.Parse<TypeDef, Space, Options> | undefined
            : Fragment.Parse<TypeDef, Space, Options>
        : unknown

    export const type = typeDefProxy as Definition

    export const parse = createParser(
        {
            type,
            parent: () => Str.parse,
            children: () => [Constraints.delegate, Optional.delegate]
        },
        {
            matches: (def) => !!def.match(modifierTokenMatcher)
        }
    )

    export const delegate = parse as any as Definition
}
