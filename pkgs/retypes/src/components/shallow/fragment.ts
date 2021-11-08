import {
    BuiltInTypeName,
    BuiltInTypes,
    UnknownTypeError,
    ParseTypeRecurseOptions
} from "./common.js"
import {
    ArrowFunction,
    List,
    NumericStringLiteral,
    Or,
    Resolution,
    Str,
    StringLiteral
} from "."
import { Component } from "../component.js"

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
          | DeclaredTypeName
          | BuiltInTypeName
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
    : Def extends BuiltInTypeName
    ? BuiltInTypes[Def]
    : Def extends keyof TypeSet
    ? Resolution.Parse<Def, TypeSet, Options>
    : UnknownTypeError<Def>

export const fragment: Component<Str.Definition, Definition> = {
    matches: ({ definition }) => typeof definition === "string",
    children: [
        // orValidator,
        // functionValidator,
        // listValidator,
        // definedTypeValidator,
        // unextractableTypeValidator,
        // extractableTypeValidator,
        // stringLiteralValidator,
        // numericStringLiteralValidator
    ]
}
