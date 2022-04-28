import { createParser, typeDefProxy } from "../internal.js"
import { StringLiteral as StringLiteral } from "./stringLiteral.js"
import { NumberLiteral as EmbeddedNumberLiteral } from "./numberLiteral.js"
import { BigintLiteral as EmbeddedBigintLiteral } from "./bigintLiteral.js"
import { Reference } from "../reference.js"
import { RegexLiteral as EmbeddedRegexLiteral } from "./regexLiteral.js"
import { FirstEnclosed } from "./internal.js"

export namespace EmbeddedLiteral {
    export type Definition =
        | StringLiteral.Definition
        | EmbeddedRegexLiteral.Definition
        | EmbeddedNumberLiteral.Definition
        | EmbeddedBigintLiteral.Definition

    export type Matches<Def extends string> =
        StringLiteral.Matches<Def> extends true
            ? true
            : EmbeddedRegexLiteral.Matches<Def> extends true
            ? true
            : Def extends
                  | EmbeddedNumberLiteral.Definition
                  | EmbeddedBigintLiteral.Definition
            ? true
            : false

    export type TypeOf<Def extends string> =
        Def extends StringLiteral.Definition<FirstEnclosed<Def, `'`>>
            ? FirstEnclosed<Def, `'`>
            : Def extends StringLiteral.Definition<FirstEnclosed<Def, `"`>>
            ? FirstEnclosed<Def, `"`>
            : Def extends EmbeddedRegexLiteral.Definition<
                  FirstEnclosed<Def, `/`>
              >
            ? string
            : // For now this is always inferred as 'number', even though the string is a literal like '5'
            Def extends EmbeddedNumberLiteral.Definition<infer Value>
            ? Value
            : Def extends EmbeddedBigintLiteral.Definition<infer Value>
            ? Value
            : unknown

    export const type = typeDefProxy as string

    export const parse = createParser({
        type,
        parent: () => Reference.parse,
        children: () => [
            StringLiteral.delegate,
            EmbeddedRegexLiteral.delegate,
            EmbeddedNumberLiteral.delegate,
            EmbeddedBigintLiteral.delegate
        ]
    })

    export const delegate = parse as any as Definition
}
