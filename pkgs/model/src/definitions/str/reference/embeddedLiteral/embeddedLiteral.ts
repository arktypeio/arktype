import { StringLiteral as StringLiteral } from "./stringLiteral.js"
import { EmbeddedNumberLiteral as EmbeddedNumberLiteral } from "./embeddedNumberLiteral.js"
import { EmbeddedBigintLiteral as EmbeddedBigintLiteral } from "./embeddedBigintLiteral.js"
import { Reference } from "../reference.js"
import { EmbeddedRegexLiteral as EmbeddedRegexLiteral } from "./embeddedRegexLiteral.js"
import {
    FirstEnclosed,
    createParser,
    typeDefProxy,
    Precedence
} from "./internal.js"

export namespace EmbeddedLiteral {
    export type Definition =
        | StringLiteral.Definition
        | EmbeddedRegexLiteral.Definition
        | EmbeddedNumberLiteral.Definition
        | EmbeddedBigintLiteral.Definition

    export type Matches<Def extends string> =
        StringLiteral.ValueFrom<Def> extends string
            ? true
            : EmbeddedRegexLiteral.Matches<Def> extends true
            ? true
            : Def extends
                  | EmbeddedNumberLiteral.Definition
                  | EmbeddedBigintLiteral.Definition
            ? true
            : false

    export type Parse<Def extends string> = Precedence<
        [
            StringLiteral.Parse<Def>,
            EmbeddedRegexLiteral.Parse<Def>,
            EmbeddedNumberLiteral.Parse<Def>,
            EmbeddedBigintLiteral.Parse<Def>
        ]
    >

    export type TypeOf<N extends string> = N extends StringLiteral.Definition<
        FirstEnclosed<N, `'`>
    >
        ? FirstEnclosed<N, `'`>
        : N extends StringLiteral.Definition<FirstEnclosed<N, `"`>>
        ? FirstEnclosed<N, `"`>
        : N extends EmbeddedRegexLiteral.Definition<FirstEnclosed<N, `/`>>
        ? string
        : // For now this is always inferred as 'number', even though the string is a literal like '5'
        N extends EmbeddedNumberLiteral.Definition<infer Value>
        ? Value
        : N extends EmbeddedBigintLiteral.Definition<infer Value>
        ? Value
        : unknown

    export const type = typeDefProxy as string

    export const parser = createParser({
        type,
        parent: () => Reference.parser,
        children: () => [
            StringLiteral.delegate,
            EmbeddedRegexLiteral.delegate,
            EmbeddedNumberLiteral.delegate,
            EmbeddedBigintLiteral.delegate
        ]
    })

    export const delegate = parser as any as Definition
}
