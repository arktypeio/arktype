import {
    ParseConfig,
    createParser,
    typeDefProxy,
    UnknownTypeError,
    ValidationErrorMessage
} from "./internal.js"
import { Keyword, NumberLiteral, StringLiteral } from "./literal"
import { ArrowFunction } from "./arrowFunction.js"
import { List } from "./list.js"
import { Or } from "./or.js"
import { Alias } from "../alias/alias.js"
import { Str } from "./str.js"

export namespace Fragment {
    export type Definition<Def extends string = string> = Def

    export type Validate<
        Def extends string,
        Root extends string,
        Typespace
    > = Def extends Or.Definition<infer First, infer Second>
        ? Or.Validate<`${First}|${Second}`, Root, Typespace>
        : Def extends ArrowFunction.Definition<infer Parameters, infer Return>
        ? ArrowFunction.Validate<Parameters, Return, Root, Typespace>
        : Def extends List.Definition<infer ListItem>
        ? Validate<ListItem, Root, Typespace>
        : Def extends
              | Keyword.Definition
              | StringLiteral.Definition
              | NumberLiteral.Definition
        ? Root
        : Def extends Alias.Definition<Typespace>
        ? Alias.Validate<Def, Root, Typespace>
        : UnknownTypeError<Def>

    export type Parse<
        Def extends string,
        Typespace,
        Options extends ParseConfig
    > = Validate<Def, Def, Typespace> extends ValidationErrorMessage
        ? unknown
        : Def extends Alias.Definition<Typespace>
        ? Alias.Parse<Def, Typespace, Options>
        : Def extends Or.Definition
        ? Or.Parse<Def, Typespace, Options>
        : Def extends ArrowFunction.Definition<infer Parameters, infer Return>
        ? ArrowFunction.Parse<Parameters, Return, Typespace, Options>
        : Def extends List.Definition<infer ListItem>
        ? Parse<ListItem, Typespace, Options>[]
        : Def extends StringLiteral.Definition<infer Literal>
        ? Literal
        : Def extends NumberLiteral.Definition<infer Value>
        ? // For now this is always inferred as 'number', even if the string is a literal like '5'
          Value
        : Def extends Keyword.Definition
        ? Keyword.Parse<Def>
        : unknown

    export const type = typeDefProxy as Definition

    export const parse = createParser({
        type,
        parent: () => Str.parse,
        matches: (definition) => typeof definition === "string",
        children: () => [
            Or.delegate,
            ArrowFunction.delegate,
            List.delegate,
            StringLiteral.delegate,
            NumberLiteral.delegate,
            Keyword.delegate,
            Alias.delegate
        ]
    })

    export const delegate = parse as any as Definition
}
