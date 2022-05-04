import { Evaluate, GetAs } from "@re-/tools"
import { Keyword, Reference } from "./reference/index.js"
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
    DefaultParseTypeContext,
    ParseError
} from "./internal.js"
import { Optional } from "./optional.js"
import { Union, Intersection, Constraint, List } from "./expression/index.js"
import { StringLiteral } from "./reference/embeddedLiteral/stringLiteral.js"
import { EmbeddedRegexLiteral } from "./reference/embeddedLiteral/embeddedRegexLiteral.js"
import { EmbeddedNumberLiteral } from "./reference/embeddedLiteral/embeddedNumberLiteral.js"
import { EmbeddedBigintLiteral } from "./reference/embeddedLiteral/embeddedBigintLiteral.js"

export namespace Str {
    export type FastParse<
        Def extends string,
        Dict,
        Ctx
    > = Def extends Keyword.Definition
        ? Keyword.KeywordTypes[Def]
        : Def extends keyof Dict
        ? Root.FastParse<Dict[Def], Dict, Ctx>
        : Def extends Optional.Definition<infer Child>
        ? FastParse<Child, Dict, Ctx> | undefined
        : Def extends Union.Definition<infer Left, infer Right>
        ? FastParse<Left, Dict, Ctx> | FastParse<Right, Dict, Ctx>
        : Def extends Intersection.Definition<infer Left, infer Right>
        ? FastParse<Left, Dict, Ctx> & FastParse<Right, Dict, Ctx>
        : Def extends List.Definition<infer Child>
        ? FastParse<Child, Dict, Ctx>[]
        : Def extends Constraint.Definition
        ? Constraint.FastParse<Def, Dict, Ctx>
        : Def extends StringLiteral.SingleQuoted<infer Text>
        ? Text
        : Def extends StringLiteral.DoubleQuoted<infer Text>
        ? Text
        : Def extends EmbeddedRegexLiteral.Definition<infer Expression>
        ? string
        : Def extends EmbeddedNumberLiteral.Definition<infer Value>
        ? Value
        : Def extends EmbeddedBigintLiteral.Definition<infer Value>
        ? Value
        : ParseError<UnknownTypeError<Def>, Ctx>

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
