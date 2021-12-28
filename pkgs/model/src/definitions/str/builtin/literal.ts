import { createParser, typeDefProxy } from "./internal.js"
import { StringLiteral } from "./stringLiteral.js"
import { NumberLiteral } from "./numberLiteral.js"
import { BigintLiteral } from "./bigintLiteral.js"
import { Builtin } from "./builtin.js"

export namespace Literal {
    export type Definition =
        | StringLiteral.Definition
        | NumberLiteral.Definition
        | BigintLiteral.Definition

    export type Parse<Def extends string> =
        Def extends StringLiteral.Definition<infer Text>
            ? Text
            : // For now this is always inferred as 'number', even though the string is a literal like '5'
            Def extends NumberLiteral.Definition<infer Value>
            ? Value
            : Def extends BigintLiteral.Definition<infer Value>
            ? Value
            : unknown

    export const type = typeDefProxy as Definition

    export const parse = createParser({
        type,
        parent: () => Builtin.parse,
        children: () => [
            StringLiteral.delegate,
            NumberLiteral.delegate,
            BigintLiteral.delegate
        ]
    })

    export const delegate = parse as any as Definition
}
