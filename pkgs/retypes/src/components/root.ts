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
    NumericStringLiteralDefinition,
    UnvalidatedDefinition
} from "../common.js"
import { ObjectDefinition } from "../definitions.js"
import { DefinitionTypeError, UnknownTypeError } from "../errors.js"
import {
    ParseListDefinition,
    ParseObjectDefinition,
    ParseStringDefinitionRecurse,
    ParseTypeRecurseOptions
} from "../parse.js"
import { String } from "./string.js"

export namespace Root {
    export type Definition<
        Def extends UnvalidatedObjectDefinition = UnvalidatedObjectDefinition
    > = Def

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
        : Definition extends UnvalidatedObjectDefinition
        ? ObjectDefinition<
              Definition,
              DeclaredTypeName,
              Options["extractTypesReferenced"]
          >
        : DefinitionTypeError

    export type TypeDefinitionOptions = {
        extractTypesReferenced?: boolean
    }

    export type Parse<
        Definition,
        TypeSet,
        Options extends ParseTypeOptions = {}
    > = ParseTypeRecurse<
        Definition,
        TypeSet,
        WithDefaults<ParseTypeOptions, Options, DefaultParseTypeOptions>
    >

    type ParseTypeRecurse<
        Definition,
        TypeSet,
        Options extends ParseTypeRecurseOptions
    > = Definition extends number
        ? Definition
        : Definition extends string
        ? String.Parse<Definition, TypeSet, Options>
        : Definition extends UnvalidatedObjectDefinition
        ? Definition extends any[]
            ? Evaluate<ParseListDefinition<Definition, TypeSet, Options>>
            : Evaluate<ParseObjectDefinition<Definition, TypeSet, Options>>
        : DefinitionTypeError

    export type ParseTypeRecurseOptions = Required<ParseTypeOptions>

    export type ParseTypeOptions = {
        onCycle?: UnvalidatedDefinition
        seen?: any
        deepOnCycle?: boolean
        onResolve?: UnvalidatedDefinition
    }

    export type DefaultParseTypeOptions = {
        onCycle: never
        seen: {}
        deepOnCycle: false
        onResolve: never
    }
}
