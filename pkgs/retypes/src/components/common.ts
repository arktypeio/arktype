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
    WithDefaults,
    Or,
    List
} from "@re-do/utils"
import {
    ListDefinition,
    OptionalDefinition,
    BuiltInTypeName,
    UnvalidatedObjectDefinition,
    FunctionDefinition,
    StringLiteralDefinition,
    NumericStringLiteralDefinition
} from "../common.js"
import { DefinitionTypeError, UnknownTypeError } from "../errors.js"
import {
    ParseStringDefinitionRecurse,
    ParseTypeRecurseOptions
} from "../parse.js"
import { Fragment } from "./fragment.js"

export type ParseSplittableResult<
    Components = any[],
    Errors extends string = string
> = {
    Components: Components extends any[] ? Components : [Components]
    Errors: Errors
}

export type ParseSplittable<
    Delimiter extends string,
    Def extends string,
    TypeSet,
    Options extends ParseTypeRecurseOptions,
    Components extends string[] = Split<Def, Delimiter>,
    ParsedComponents = {
        [I in keyof Components]: Fragment.Parse<
            Components[I] & string,
            TypeSet,
            Options
        >
    },
    ComponentErrors = {
        [I in keyof ParsedComponents]: ParsedComponents[I] extends UnknownTypeError
            ? ParsedComponents[I]
            : never
    }
> = ParseSplittableResult<
    ParsedComponents,
    StringifyPossibleTypes<
        Extract<ComponentErrors[keyof ComponentErrors], UnknownTypeError>
    >
>

export type ValidateSplittable<
    Delimiter extends string,
    Def extends string,
    Root extends string,
    DeclaredTypeName extends string,
    ExtractTypesReferenced extends boolean,
    Components extends string[] = Split<Def, Delimiter>,
    ValidateDefinitions extends string[] = {
        [Index in keyof Components]: Fragment.Validate<
            Components[Index] & string,
            Components[Index] & string,
            DeclaredTypeName,
            ExtractTypesReferenced
        >
    },
    ValidatedDefinition extends string = Join<ValidateDefinitions, Delimiter>
> = ExtractTypesReferenced extends true
    ? Unlisted<ValidateDefinitions>
    : Def extends ValidatedDefinition
    ? Root
    : StringifyPossibleTypes<
          Extract<
              ValidateDefinitions[keyof ValidateDefinitions],
              UnknownTypeError
          >
      >
