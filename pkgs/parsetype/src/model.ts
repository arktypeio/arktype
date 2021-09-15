import {
    Narrow,
    transform,
    Entry,
    Evaluate,
    ElementOf,
    NonRecursible
} from "@re-do/utils"
import { ParseTypeSet, TypeDefinition, ValidatedObjectDef } from ".."

type Iteration<T, Current extends T, Remaining extends T[]> = [
    Current,
    ...Remaining
]

type FromEntries<
    Entries extends Entry[],
    Result extends object = {}
> = Entries extends Iteration<Entry, infer Current, infer Remaining>
    ? FromEntries<Remaining, Merge<Result, { [K in Current[0]]: Current[1] }>>
    : Result

type Merge<A, B> = A extends any[] | NonRecursible
    ? B
    : {
          [K in keyof A | keyof B]: K extends keyof A
              ? K extends keyof B
                  ? B[K]
                  : A[K]
              : K extends keyof B
              ? B[K]
              : never
      }

type MergeAll<Objects, Result extends object = {}> = Objects extends Iteration<
    any,
    infer Current,
    infer Remaining
>
    ? MergeAll<Remaining, Merge<Result, Current>>
    : Result

type ParseDefinitions<Definitions> = Evaluate<
    ParseTypeSet<MergeAll<Definitions>>
>

const createDefineFunctionMap = <DeclaredTypeNames extends string[]>(
    typeNames: DeclaredTypeNames
) =>
    transform(typeNames, ([index, typeName]) => [
        typeName as string,
        createDefineFunction(typeName as string)
    ]) as {
        [DefinedTypeName in ElementOf<DeclaredTypeNames>]: DefineFunction<
            ElementOf<DeclaredTypeNames>,
            DefinedTypeName
        >
    }

type DefineFunction<
    DeclaredTypeName extends string,
    DefinedTypeName extends DeclaredTypeName
> = <Definition extends ValidatedObjectDef<DeclaredTypeName, Definition>>(
    definition: Narrow<Definition>
) => { [K in DefinedTypeName]: Definition }

const createDefineFunction =
    <DeclaredTypeName extends string, DefinedTypeName extends DeclaredTypeName>(
        definedTypeName: DefinedTypeName
    ): DefineFunction<DeclaredTypeName, DefinedTypeName> =>
    (definition: any) =>
        ({ [definedTypeName]: definition } as any)

export const declareTypes = <DeclaredTypeNames extends string[]>(
    ...names: Narrow<DeclaredTypeNames>
) => ({
    define: createDefineFunctionMap(names)
})

type ValidatedDefinitions<
    Definitions,
    DeclaredTypeName extends string = Extract<
        keyof MergeAll<Definitions>,
        string
    >
> = {
    [K in keyof Definitions]: TypeDefinition<DeclaredTypeName, Definitions[K]>
}

export const createTypes = <
    Definitions extends ValidatedDefinitions<Definitions>
>(
    definitions: Narrow<Definitions>
) => [] as any as ParseDefinitions<Definitions>
