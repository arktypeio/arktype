import { createParser, typeDefProxy } from "./internal.js"
import { Keyword, NumberLiteral, StringLiteral } from "."
import { Str } from "../str.js"

export namespace Literal {
    export type Definition =
        | Keyword.Definition
        | StringLiteral.Definition
        | NumberLiteral.Definition

    export type Parse<Def extends string> = Def extends Keyword.Definition
        ? Keyword.Parse<Def>
        : Def extends StringLiteral.Definition<infer Literal>
        ? Literal
        : // For now this is always inferred as 'number', even though the string is a literal like '5'
        Def extends NumberLiteral.Definition<infer Value>
        ? Value
        : unknown

    export const type = typeDefProxy as Definition

    export const parse = createParser({
        type,
        parent: () => Str.parse,
        children: () => [
            Keyword.delegate,
            StringLiteral.delegate,
            NumberLiteral.delegate
        ]
    })

    export const delegate = parse as any as Definition
}
