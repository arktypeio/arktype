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
    UnvalidatedRecursibleDefinition,
    UnvalidatedDefinition,
    DefaultParseTypeOptions
} from "./common.js"
import { DefinitionTypeError } from "../errors.js"
import { ParseTypeRecurseOptions } from "../parse.js"
import { String } from "./shallow"
import { Obj, Tuple } from "./recursible"
import { ParseTypeOptions } from "./common.js"

export namespace Root {
    export type Definition<Def extends UnvalidatedDefinition> = Def

    export type Validate<
        Definition,
        DeclaredTypeName extends string,
        ProvidedOptions extends TypeDefinitionOptions = {},
        Options extends Required<TypeDefinitionOptions> = WithDefaults<
            TypeDefinitionOptions,
            ProvidedOptions,
            { extractTypesReferenced: false }
        >
    > = Definition extends number
        ? number
        : Definition extends string
        ? String.Validate<
              Definition,
              DeclaredTypeName,
              Options["extractTypesReferenced"]
          >
        : Definition extends UnvalidatedRecursibleDefinition
        ? Definition extends any[]
            ? Tuple.Validate<
                  Definition,
                  DeclaredTypeName,
                  Options["extractTypesReferenced"]
              >
            : Obj.Validate<
                  Definition,
                  DeclaredTypeName,
                  Options["extractTypesReferenced"]
              >
        : DefinitionTypeError

    export type TypeDefinitionOptions = {
        extractTypesReferenced?: boolean
    }

    export type BaseParse<
        Definition,
        TypeSet,
        Options extends ParseTypeOptions = {}
    > = Parse<
        Definition,
        TypeSet,
        WithDefaults<ParseTypeOptions, Options, DefaultParseTypeOptions>
    >

    export type Parse<
        Def,
        TypeSet,
        Options extends ParseTypeRecurseOptions
    > = Def extends number
        ? Def
        : Def extends string
        ? String.Parse<Def, TypeSet, Options>
        : Def extends UnvalidatedRecursibleDefinition
        ? Def extends any[]
            ? Evaluate<Tuple.Parse<Def, TypeSet, Options>>
            : Evaluate<Obj.Parse<Def, TypeSet, Options>>
        : DefinitionTypeError
}
