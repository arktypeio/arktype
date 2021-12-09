import {
    ParseConfig,
    createParser,
    typeDefProxy,
    UnknownTypeError,
    ValidationErrorMessage
} from "./common.js"
import { ArrowFunction } from "./arrowFunction.js"
import { BuiltIn } from "./builtIn.js"
import { List } from "./list.js"
import { NumericStringLiteral } from "./numericStringLiteral.js"
import { Or } from "./or.js"
import { Resolution } from "./resolution.js"
import { StringLiteral } from "./stringLiteral.js"
import { Str } from "./str.js"

export namespace Fragment {
    export type Definition<Def extends string = string> = Def

    export type Validate<
        Def extends string,
        Root extends string,
        TypeSet
    > = Def extends Or.Definition<infer First, infer Second>
        ? Or.Validate<`${First}|${Second}`, Root, TypeSet>
        : Def extends ArrowFunction.Definition<infer Parameters, infer Return>
        ? ArrowFunction.Validate<Parameters, Return, Root, TypeSet>
        : Def extends List.Definition<infer ListItem>
        ? Validate<ListItem, Root, TypeSet>
        : Def extends
              | BuiltIn.Definition
              | StringLiteral.Definition
              | NumericStringLiteral.Definition
        ? Root
        : Def extends Resolution.Definition<TypeSet>
        ? Resolution.Validate<Def, Root, TypeSet>
        : UnknownTypeError<Def>

    export type Parse<
        Def extends string,
        TypeSet,
        Options extends ParseConfig
    > = Validate<Def, Def, TypeSet> extends ValidationErrorMessage
        ? unknown
        : Def extends Resolution.Definition<TypeSet>
        ? Resolution.Parse<Def, TypeSet, Options>
        : Def extends Or.Definition
        ? Or.Parse<Def, TypeSet, Options>
        : Def extends ArrowFunction.Definition<infer Parameters, infer Return>
        ? ArrowFunction.Parse<Parameters, Return, TypeSet, Options>
        : Def extends List.Definition<infer ListItem>
        ? Parse<ListItem, TypeSet, Options>[]
        : Def extends StringLiteral.Definition<infer Literal>
        ? Literal
        : Def extends NumericStringLiteral.Definition<infer Value>
        ? // For now this is always inferred as 'number', even if the string is a literal like '5'
          Value
        : Def extends BuiltIn.Definition
        ? BuiltIn.Parse<Def>
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
            NumericStringLiteral.delegate,
            BuiltIn.delegate,
            Resolution.delegate
        ]
    })

    export const delegate = parse as any as Definition
}
