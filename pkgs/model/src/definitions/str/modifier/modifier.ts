import { IncludesSubstring } from "@re-/tools"
import {
    ParseConfig,
    createParser,
    typeDefProxy,
    ModifierToken,
    modifierTokenMatcher,
    CheckModifier
} from "./internal.js"
import { Fragment } from "../fragment.js"
import { Optional } from "./optional.js"
import { Constraints } from "./constraint.js"
import { Str } from "../str.js"

export namespace Modifier {
    export type Definition = `${string}${ModifierToken}${string}`

    export type Check<
        Def extends string,
        Root extends string,
        Space
    > = IncludesSubstring<Def, ":"> extends true
        ? CheckModifier<":", Def, Root, Space>
        : IncludesSubstring<Def, "?"> extends true
        ? CheckModifier<"?", Def, Root, Space>
        : Fragment.Check<Def, Root, Space>

    export type Parse<
        Def extends string,
        Space,
        Options extends ParseConfig
    > = Def extends Constraints.Definition<infer TypeDef, infer Constraints>
        ? Modifier.Parse<TypeDef, Space, Options>
        : Def extends Optional.Definition<infer Inner>
        ? Fragment.Parse<Inner, Space, Options> | undefined
        : Fragment.Parse<Def, Space, Options>

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
