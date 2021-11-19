import {
    Iteration,
    KeyValuate,
    ListPossibleTypes,
    mergeAll,
    Narrow,
    Split,
    transform
} from "@re-do/utils"
import { UnvalidatedTypeSet } from "./common.js"
import { createParseFunction, ParseFunction, ParsedTypeSet } from "./parse.js"
import {
    ElementOf,
    StringifyPossibleTypes,
    MergeAll,
    DiffUnions,
    UnionDiffResult
} from "@re-do/utils"
import { Validate } from "./definition.js"
import { Recursible } from "./components/recursible/recursible.js"
import { Obj } from "./components/recursible/obj.js"
import { ControlCharacters } from "./components/common.js"
import { ShallowCycleError } from "./components/errors.js"

// Just use unknown for now since we don't have all the definitions yet
// but we still want to allow references to other declared types
export type UncompiledTypeSet<DeclaredTypeName extends string> = {
    [TypeName in DeclaredTypeName]: "unknown"
}

export type TypeDefinitions<
    Definitions,
    DeclaredTypeName extends string = TypeNameFrom<Definitions>
> = {
    [Index in keyof Definitions]: Validate<
        Definitions[Index],
        UncompiledTypeSet<DeclaredTypeName>
    >
}

type ExtractReferences<
    Def extends string,
    Filter extends string = string
> = RawReferences<Def> & Filter

type RawReferences<
    Fragments extends string,
    RemainingControlCharacters extends string[] = ControlCharacters
> = RemainingControlCharacters extends Iteration<
    string,
    infer Character,
    infer Remaining
>
    ? RawReferences<ElementOf<Split<Fragments, Character>>, Remaining>
    : Exclude<ElementOf<Split<Fragments, RemainingControlCharacters[0]>>, "">

type ExtractReferenceList<
    Def extends string,
    Filter extends string = string
> = ListPossibleTypes<RawReferences<Def> & Filter>

type CheckReferencesForShallowCycle<
    References extends string[],
    TypeSet,
    Seen
> = References extends Iteration<string, infer Current, infer Remaining>
    ? CheckForShallowCycleRecurse<
          KeyValuate<TypeSet, Current>,
          TypeSet,
          Seen | Current
      > extends never
        ? CheckReferencesForShallowCycle<Remaining, TypeSet, Seen>
        : CheckForShallowCycleRecurse<
              KeyValuate<TypeSet, Current>,
              TypeSet,
              Seen | Current
          >
    : never

type CheckForShallowCycleRecurse<Def, TypeSet, Seen> = Def extends Seen
    ? Seen
    : Def extends string
    ? CheckReferencesForShallowCycle<ExtractReferenceList<Def>, TypeSet, Seen>
    : never

type CheckForShallowCycle<Def, TypeSet> = CheckForShallowCycleRecurse<
    Def,
    TypeSet,
    never
>

type ValidateDefinition<Def, Set> = CheckForShallowCycle<Def, Set> extends never
    ? Validate<Def, Set>
    : ShallowCycleError<Def & string, CheckForShallowCycle<Def, Set>>

export type TypeSet<Set> = {
    [TypeName in keyof Set]: ValidateDefinition<Set[TypeName], Set>
}

export type TypeSetFromDefinitions<Definitions> = MergeAll<
    TypeDefinitions<Definitions>
>

export type TypeNameFrom<Definitions> = keyof MergeAll<Definitions> & string

export type MissingTypesError<DeclaredTypeName, DefinedTypeName> = DiffUnions<
    DeclaredTypeName,
    DefinedTypeName
> extends UnionDiffResult<infer Extraneous, infer Missing>
    ? Missing extends []
        ? Extraneous extends []
            ? {}
            : `Defined types '${StringifyPossibleTypes<
                  ElementOf<Extraneous>
              >}' were never declared.`
        : `Declared types ${StringifyPossibleTypes<`'${ElementOf<Missing>}'`>} were never defined.`
    : never

export type TypeSetDefinitions<
    Definitions,
    DeclaredTypeName extends string = TypeNameFrom<Definitions>,
    DefinedTypeName extends string = TypeNameFrom<Definitions>
> = MissingTypesError<DeclaredTypeName, DefinedTypeName> &
    {
        [Index in keyof Definitions]: Definitions[Index] extends Obj.Definition<
            Definitions[Index]
        >
            ? Validate<Definitions[Index], UncompiledTypeSet<DeclaredTypeName>>
            : `Definitions must be objects with string keys representing defined type names.`
    }

type Z = Validate<
    { a: "b" },
    UncompiledTypeSet<TypeNameFrom<[{ a: "b" }, { b: "a" }]>>
>

export const createCompileFunction =
    <DeclaredTypeNames extends string[]>(names: Narrow<DeclaredTypeNames>) =>
    <Definitions, MergedTypeSet = TypeSetFromDefinitions<Definitions>>(
        // @ts-ignore
        ...definitions: Narrow<
            [] extends DeclaredTypeNames
                ? TypeSetDefinitions<Definitions>
                : TypeSetDefinitions<Definitions, ElementOf<DeclaredTypeNames>>
        >
    ) => {
        const typeSetFromDefinitions = mergeAll(definitions as any) as any

        const parse = createParseFunction(
            typeSetFromDefinitions
        ) as any as ParseFunction<MergedTypeSet>
        return {
            parse,
            types: transform(
                typeSetFromDefinitions,
                ([typeName, definition]) => [
                    typeName,
                    // @ts-ignore
                    parse(definition, {
                        // @ts-ignore
                        typeSet: typeSetFromDefinitions
                    })
                ]
            ) as ParsedTypeSet<MergedTypeSet>
        }
    }

// Exported compile function is equivalent to compile from an empty declare call
// and will not validate missing or extraneous definitions
export const compile = createCompileFunction([])

export type CompileFunction<DeclaredTypeNames extends string[]> = <
    Definitions extends any[]
>(
    definitions: [] extends DeclaredTypeNames
        ? TypeSetDefinitions<Definitions>
        : TypeSetDefinitions<Definitions, ElementOf<DeclaredTypeNames>>
) => CompiledTypeSet<Definitions>

export type CompiledTypeSet<
    Definitions extends Recursible.Definition[],
    MergedTypeSet extends UnvalidatedTypeSet = TypeSetFromDefinitions<Definitions>
> = {
    parse: ParseFunction<MergedTypeSet>
    types: ParsedTypeSet<MergedTypeSet>
}
