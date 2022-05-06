import { Keyword, Reference, Alias } from "./reference/index.js"
import { Expression } from "./expression/index.js"
import {
    createParser,
    typeDefProxy,
    UnknownTypeError,
    Root,
    ParseError,
    BinaryValidate
} from "./internal.js"
import { Optional } from "./optional.js"
import { Union, Intersection, List, Constraint } from "./expression/index.js"
import { StringLiteral } from "./reference/embeddedLiteral/stringLiteral.js"
import { EmbeddedRegexLiteral } from "./reference/embeddedLiteral/embeddedRegexLiteral.js"
import { EmbeddedNumberLiteral } from "./reference/embeddedLiteral/embeddedNumberLiteral.js"
import { EmbeddedBigintLiteral } from "./reference/embeddedLiteral/embeddedBigintLiteral.js"

export namespace Str {
    export type FastParse<
        Def extends string,
        Dict,
        Seen
    > = Def extends Keyword.Definition
        ? Keyword.KeywordTypes[Def]
        : Def extends keyof Dict
        ? // @ts-ignore
          Alias.FastParse<Def, Dict, Seen> //Root.FastParse<Dict[Def], Dict, Ctx>
        : Def extends Optional.Definition<infer Child>
        ? FastParse<Child, Dict, Seen> | undefined
        : Def extends StringLiteral.Definition<infer Text>
        ? Text
        : Def extends EmbeddedRegexLiteral.Definition<infer Expression>
        ? string
        : Def extends EmbeddedNumberLiteral.Definition<infer Value>
        ? Value
        : Def extends EmbeddedBigintLiteral.Definition<infer Value>
        ? Value
        : Def extends Intersection.Definition<infer Left, infer Right>
        ? Str.FastParse<Left, Dict, Seen> & Str.FastParse<Right, Dict, Seen>
        : Def extends Union.Definition<infer Left, infer Right>
        ? Str.FastParse<Left, Dict, Seen> | Str.FastParse<Right, Dict, Seen>
        : Def extends List.Definition<infer Child>
        ? FastParse<Child, Dict, Seen>[]
        : Def extends Constraint.Definition
        ? Constraint.FastParse<Def, Dict, Seen>
        : ParseError<UnknownTypeError<Def>>

    export type FastValidate<Def extends string, Dict, Root> = Def extends
        | Keyword.Definition
        | keyof Dict
        | "cyclic"
        | "resolution"
        ? Root
        : Def extends Optional.Definition<infer Child>
        ? Optional.FastValidate<Child, Dict, Root>
        : Def extends
              | StringLiteral.Definition<infer Text>
              | EmbeddedRegexLiteral.Definition<infer Expression>
              | EmbeddedNumberLiteral.Definition
              | EmbeddedBigintLiteral.Definition
        ? Root
        : Def extends Intersection.Definition<infer Left, infer Right>
        ? BinaryValidate<Left, Right, Dict, Root>
        : Def extends Union.Definition<infer Left, infer Right>
        ? BinaryValidate<Left, Right, Dict, Root>
        : Def extends List.Definition<infer Child>
        ? FastValidate<Child, Dict, Root>
        : Def extends Constraint.Definition
        ? Constraint.FastValidate<Def, Dict, Root>
        : ParseError<UnknownTypeError<Def>>

    export const type = typeDefProxy as string

    export const parser = createParser(
        {
            type,
            parent: () => Root.parser,
            children: () => [
                Optional.delegate,
                Reference.delegate,
                Expression.delegate
            ]
        },
        {
            matches: (def) => typeof def === "string"
        }
    )

    export const delegate = parser as any as string
}
