import {
    ParseTypeRecurseOptions,
    ValidateTypeRecurseOptions
} from "./common.js"
import { ArrowFunction } from "./arrowFunction.js"
import { BuiltIn } from "./builtIn.js"
import { List } from "./list.js"
import { NumericStringLiteral } from "./numericStringLiteral.js"
import { Or } from "./or.js"
import { Resolution } from "./resolution.js"
import { StringLiteral } from "./stringLiteral.js"
import { Str } from "./str.js"
import { createParser } from "../parser.js"
import { typeDefProxy } from "../../common.js"
import { UnknownTypeError, ValidationErrorMessage } from "../errors.js"
import { DefaultValidateTypeOptions } from "../../definition.js"

export namespace Fragment {
    export type Definition<Def extends string = string> = Def

    export type Validate<
        Def extends string,
        Root extends string,
        TypeSet,
        Options extends ValidateTypeRecurseOptions
    > = Def extends Resolution.Definition<TypeSet>
        ? Resolution.Validate<Def, Root, TypeSet, Options>
        : Def extends Or.Definition<infer First, infer Second>
        ? Or.Validate<`${First}|${Second}`, Root, TypeSet, Options>
        : Def extends ArrowFunction.Definition<infer Parameters, infer Return>
        ? ArrowFunction.Validate<Parameters, Return, Root, TypeSet, Options>
        : Def extends List.Definition<infer ListItem>
        ? Validate<ListItem, Root, TypeSet, Options>
        : Def extends
              | BuiltIn.Definition
              | StringLiteral.Definition
              | NumericStringLiteral.Definition
        ? Options["extractTypesReferenced"] extends true
            ? Def
            : Root
        : UnknownTypeError<Def>

    export type Parse<
        Def extends string,
        TypeSet,
        Options extends ParseTypeRecurseOptions
    > = Validate<
        Def,
        Def,
        TypeSet,
        DefaultValidateTypeOptions
    > extends ValidationErrorMessage
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
        : UnknownTypeError<Def>

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
