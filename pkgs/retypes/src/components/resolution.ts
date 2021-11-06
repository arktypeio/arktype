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
    Or as Either
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
import { Root } from "./root.js"

export namespace Resolution {
    export type Definition<Definition extends string = string> = Definition

    export type Validate<
        Def extends string,
        DeclaredTypeName extends string,
        ExtractTypesReferenced extends boolean
    > = Def extends DeclaredTypeName ? Def : UnknownTypeError<Def>

    export type Parse<
        TypeName extends keyof TypeSet,
        TypeSet,
        Options extends ParseTypeRecurseOptions
    > = TypeName extends keyof Options["seen"]
        ? Options["onCycle"] extends never
            ? ParseResolvedNonCyclicDefinition<TypeName, TypeSet, Options>
            : ParseResolvedCyclicDefinition<TypeName, TypeSet, Options>
        : ParseResolvedNonCyclicDefinition<TypeName, TypeSet, Options>

    export type ParseResolvedCyclicDefinition<
        TypeName extends keyof TypeSet,
        TypeSet,
        Options extends ParseTypeRecurseOptions
    > = Root.Parse<
        Options["onCycle"],
        Omit<TypeSet, "cyclic"> & { cyclic: TypeSet[TypeName] },
        {
            onCycle: Options["deepOnCycle"] extends true
                ? Options["onCycle"]
                : never
            seen: {}
            onResolve: Options["onResolve"]
            deepOnCycle: Options["deepOnCycle"]
        }
    >

    export type ParseResolvedNonCyclicDefinition<
        TypeName extends keyof TypeSet,
        TypeSet,
        Options extends ParseTypeRecurseOptions
    > = Either<
        Options["onResolve"] extends never ? true : false,
        TypeName extends "resolved" ? true : false
    > extends true
        ? Root.Parse<
              TypeSet[TypeName],
              TypeSet,
              Options & {
                  seen: { [K in TypeName]: true }
              }
          >
        : Root.Parse<
              Options["onResolve"],
              Omit<TypeSet, "resolved"> & { resolved: TypeSet[TypeName] },
              Options & {
                  seen: { [K in TypeName]: true }
              }
          >
}
