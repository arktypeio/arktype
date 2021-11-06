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
    Or
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
import { StringDefinitionRecurse } from "../definitions.js"
import { DefinitionTypeError, UnknownTypeError } from "../errors.js"
import {
    ParseStringDefinitionRecurse,
    ParseTypeRecurseOptions
} from "../parse.js"

export namespace Or {
    export type Definition<
        First extends string = string,
        Second extends string = string
    > = `${First}|${Second}`

    export type Parse<
        Def extends Definition,
        TypeSet,
        Options extends ParseTypeRecurseOptions,
        Components extends string[] = Split<Def, "|">,
        ParsedComponents = {
            [Index in keyof Components]: ParseStringDefinitionRecurse<
                Components[Index] & string,
                TypeSet,
                Options
            >
        },
        ComponentErrors = {
            [I in keyof ParsedComponents]: ParsedComponents[I] extends UnknownTypeError
                ? ParsedComponents[I]
                : never
        }
    > = ComponentErrors extends never[]
        ? Unlisted<ParsedComponents>
        : StringifyPossibleTypes<
              Extract<ComponentErrors[keyof ComponentErrors], UnknownTypeError>
          >

    export type Validate<
        Def extends Definition,
        Root extends string,
        DeclaredTypeName extends string,
        ExtractTypesReferenced extends boolean,
        Components extends string[] = Split<Def, "|">,
        ValidateDefinitions extends string[] = {
            [Index in keyof Components]: StringDefinitionRecurse<
                Components[Index] & string,
                Components[Index] & string,
                DeclaredTypeName,
                ExtractTypesReferenced
            >
        },
        ValidatedDefinition extends string = Join<ValidateDefinitions, "|">
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
}
