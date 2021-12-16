import { ParseConfig, createParser, typeDefProxy } from "./internal.js"
import { Keyword, NumberLiteral, StringLiteral } from "."
import { Fragment } from "../fragment.js"

export namespace Literal {
    type LiteralExpression =
        | Keyword.Definition
        | StringLiteral.Definition
        | NumberLiteral.Definition

    export type Definition<Def extends LiteralExpression = LiteralExpression> =
        Def

    export type Parse<
        Def extends string,
        Typespace,
        Options extends ParseConfig
    > = Def extends StringLiteral.Definition<infer Literal>
        ? Literal
        : Def extends NumberLiteral.Definition<infer Value>
        ? // For now this is always inferred as 'number', even though the string is a literal like '5'
          Value
        : Def extends Keyword.Definition
        ? Keyword.Parse<Def>
        : unknown

    export const type = typeDefProxy as Definition

    export const parse = createParser({
        type,
        parent: () => Fragment.parse,
        children: () => [
            StringLiteral.delegate,
            NumberLiteral.delegate,
            Keyword.delegate
        ]
    })

    export const delegate = parse as any as Definition
}
