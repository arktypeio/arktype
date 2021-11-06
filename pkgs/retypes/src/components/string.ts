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
import { Fragment } from "./fragment.js"
import { Or } from "./or.js"

export namespace String {
    export type Definition<Definition extends string = string> = Definition

    export type Validate<
        Definition extends string,
        DeclaredTypeName extends string,
        ExtractTypesReferenced extends boolean,
        ParsableDefinition extends string = RemoveSpaces<Definition>
    > = Fragment.Validate<
        ParsableDefinition extends OptionalDefinition<infer Optional>
            ? Optional
            : ParsableDefinition,
        Definition,
        DeclaredTypeName,
        ExtractTypesReferenced
    >

    export type Parse<
        Def extends string,
        TypeSet,
        Options extends ParseTypeRecurseOptions,
        ParsableDefinition extends string = RemoveSpaces<Def>
    > =
        // If Definition is an error, e.g. from an invalid TypeSet, return it immediately
        Def extends UnknownTypeError
            ? Def
            : ParsableDefinition extends OptionalDefinition<infer OptionalType>
            ?
                  | ParseStringDefinitionRecurse<OptionalType, TypeSet, Options>
                  | undefined
            : ParseStringDefinitionRecurse<ParsableDefinition, TypeSet, Options>
}
