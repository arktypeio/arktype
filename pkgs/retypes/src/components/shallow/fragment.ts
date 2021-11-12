import {
    BuiltInTypeName,
    BuiltInTypes,
    UnknownTypeError,
    ParseTypeRecurseOptions
} from "./common.js"
import { ArrowFunction } from "./arrowFunction.js"
import { BuiltIn } from "./builtIn.js"
import { List } from "./list.js"
import { NumericStringLiteral } from "./numericStringLiteral.js"
import { Or } from "./or.js"
import { Resolution } from "./resolution.js"
import { StringLiteral } from "./stringLiteral.js"
import { Str } from "./str.js"
import { NodeInput, createNode, createParser } from "../parser.js"
import { typeDefProxy } from "../../common.js"

export namespace Fragment {
    export type Definition<Def extends string = string> = Def

    export type Validate<
        Def extends string,
        Root extends string,
        DeclaredTypeName extends string,
        ExtractTypesReferenced extends boolean
    > = Def extends Or.Definition<infer First, infer Second>
        ? Or.Validate<
              `${First}|${Second}`,
              Root,
              DeclaredTypeName,
              ExtractTypesReferenced
          >
        : Def extends ArrowFunction.Definition<infer Parameters, infer Return>
        ? ArrowFunction.Validate<
              Parameters,
              Return,
              Root,
              DeclaredTypeName,
              ExtractTypesReferenced
          >
        : Def extends List.Definition<infer ListItem>
        ? Validate<ListItem, Root, DeclaredTypeName, ExtractTypesReferenced>
        : Def extends
              | Resolution.Definition<DeclaredTypeName>
              | BuiltIn.Definition
              | StringLiteral.Definition
              | NumericStringLiteral.Definition
        ? ExtractTypesReferenced extends true
            ? Def
            : Root
        : UnknownTypeError<Def>

    export type Parse<
        Def extends string,
        TypeSet,
        Options extends ParseTypeRecurseOptions
    > = Def extends Or.Definition
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
        : Def extends keyof TypeSet
        ? Resolution.Parse<Def, TypeSet, Options>
        : UnknownTypeError<Def>

    export const type = typeDefProxy as Definition

    export const node = createNode({
        type,
        parent: () => Str.node,
        matches: ({ definition }) => typeof definition === "string"
    })

    export const parse = createParser(
        node,
        Or.parse,
        ArrowFunction.parse,
        List.parser,
        StringLiteral.parse,
        NumericStringLiteral.parse,
        BuiltIn.parse,
        Resolution.parse
    )
}
