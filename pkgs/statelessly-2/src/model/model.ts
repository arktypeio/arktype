import {
    ExcludeByValue,
    FilterByValue,
    Narrow,
    Exact,
    NonRecursible,
    Merge,
    Key,
    ValueOf,
    ValueFrom,
    Unlisted,
    transform,
    SimpleFunction,
    ExcludedByKeys
} from "@re-do/utils"
import { ParseTypeSet, Evaluate } from "../createTypes"
import { TypeDefinition, ValidatedObjectDef } from ".."

type EntryIteration<Current extends Entry, Remaining extends Entry[]> = [
    Current,
    ...Remaining
]

type FromEntries<
    Entries extends Entry[],
    Result extends object = {}
> = Entries extends EntryIteration<infer Current, infer Remaining>
    ? FromEntries<Remaining, Merge<Result, { [K in Current[0]]: Current[1] }>>
    : Result

type ParseModel<Definitions extends Entry[]> = Evaluate<
    ParseTypeSet<FromEntries<Definitions>>
>

const model = <Definitions extends Entry[]>(...definitions: Definitions) =>
    Object.fromEntries(definitions) as Evaluate<
        ParseTypeSet<FromEntries<Definitions>>
    >

type Entry<K extends Key = Key, V = any> = [K, V]

type KeyOfEntries<
    Entries extends Entry[],
    Result = never
> = Entries extends EntryIteration<infer Current, infer Remaining>
    ? KeyOfEntries<Remaining, Result | Current[0]>
    : Result

type ModeledTypeName<Definitions extends Entry[]> = Extract<
    KeyOfEntries<Definitions>,
    string
>

export const createModel = <
    Definitions extends Entry[],
    DefinedTypeName extends string = ModeledTypeName<Definitions>
>(
    ...definitions: Definitions
) => ({
    define: <
        Name extends string,
        Definition extends ValidatedObjectDef<DefinedTypeName, Definition>
    >(
        name: Name,
        definition: Narrow<Definition>
    ) => [name, definition] as [Name, Definition]
})

const createDefineFunctionMap = <DeclaredTypeNames extends string[]>(
    typeNames: DeclaredTypeNames
) =>
    transform(typeNames, ([index, typeName]) => [
        typeName as string,
        createDefineFunction()
    ]) as {
        [DefinedTypeName in Unlisted<DeclaredTypeNames>]: DefineFunction<
            Unlisted<DeclaredTypeNames>,
            DefinedTypeName
        >
    }

type DefineFunction<
    DeclaredTypeName extends string,
    DefinedTypeName extends DeclaredTypeName
> = <Definition extends ValidatedObjectDef<DeclaredTypeName, Definition>>(
    definition: Narrow<Definition>
) => Entry<DefinedTypeName, Definition>

const createDefineFunction =
    <
        DeclaredTypeName extends string,
        DefinedTypeName extends DeclaredTypeName
    >(): DefineFunction<DeclaredTypeName, DefinedTypeName> =>
    (definition: any) =>
        definition

export const declareTypes = <TypeNames extends string[]>(
    ...typeNames: Narrow<TypeNames>
) => ({
    define: createDefineFunctionMap(typeNames)
})
