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
import { DefinitionTypeError, UnknownTypeError } from "../errors.js"
import {
    ParseStringDefinitionRecurse,
    ParseTypeRecurseOptions
} from "../parse.js"
import {
    ParseSplittable,
    ParseSplittableResult,
    ValidateSplittable
} from "./common.js"

export namespace Or {
    export type Definition<
        First extends string = string,
        Second extends string = string
    > = `${First}|${Second}`

    export type Parse<
        Def extends Definition,
        TypeSet,
        Options extends ParseTypeRecurseOptions,
        Result extends ParseSplittableResult = ParseSplittable<
            "|",
            Def,
            TypeSet,
            Options
        >
    > = Result["Errors"] extends ""
        ? Unlisted<Result["Components"]>
        : Result["Errors"]

    export type Validate<
        Def extends Definition,
        Root extends string,
        DeclaredTypeName extends string,
        ExtractTypesReferenced extends boolean
    > = ValidateSplittable<
        "|",
        Def,
        Root,
        DeclaredTypeName,
        ExtractTypesReferenced
    >
}
