import {
    transform,
    ElementOf,
    TypeError,
    ListPossibleTypes,
    Evaluate,
    StringifyPossibleTypes,
    MergeAll,
    DiffUnions,
    UnionDiffResult,
    RemoveSpaces,
    Split,
    Join,
    Unlisted,
    Narrow,
    WithDefaults
} from "@re-do/utils"
import {
    OrDefinition,
    ListDefinition,
    OptionalDefinition,
    BuiltInTypeName,
    UnvalidatedObjectDefinition,
    FunctionDefinition,
    StringLiteralDefinition,
    NumericStringLiteralDefinition,
    BuiltInTypes
} from "../common.js"
import { DefinitionTypeError, UnknownTypeError } from "../errors.js"
import {
    ParseResolvedDefinition,
    ParseStringDefinitionRecurse,
    ParseStringFunctionDefinitionRecurse,
    ParseTypeRecurseOptions
} from "../parse.js"
import { Function } from "./function.js"
import { Or } from "./or.js"
import { Resolution } from "./resolution.js"

export namespace Fragment {
    export type Definition<Definition extends string = string> = Definition

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
        : Def extends FunctionDefinition<infer Parameters, infer Return>
        ? Function.Validate<
              Parameters,
              Return,
              Root,
              DeclaredTypeName,
              ExtractTypesReferenced
          >
        : Def extends ListDefinition<infer ListItem>
        ? Validate<ListItem, Root, DeclaredTypeName, ExtractTypesReferenced>
        : Def extends
              | DeclaredTypeName
              | BuiltInTypeName
              | StringLiteralDefinition
              | NumericStringLiteralDefinition
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
        : Def extends Function.Definition<infer Parameters, infer Return>
        ? Function.Parse<Parameters, Return, TypeSet, Options>
        : Def extends ListDefinition<infer ListItem>
        ? ParseStringDefinitionRecurse<ListItem, TypeSet, Options>[]
        : Def extends StringLiteralDefinition<infer Literal>
        ? `${Literal}`
        : Def extends NumericStringLiteralDefinition<infer Value>
        ? // For now this is always inferred as 'number', even if the string is a literal like '5'
          Value
        : Def extends BuiltInTypeName
        ? BuiltInTypes[Def]
        : Def extends keyof TypeSet
        ? Resolution.Parse<Def, TypeSet, Options>
        : UnknownTypeError<Def>
}
