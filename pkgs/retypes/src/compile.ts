import { List, mergeAll, Narrow, transform, WithDefaults } from "@re-do/utils"
import { formatTypes, UnvalidatedTypeSet } from "./common.js"
import { createParseFunction, ParseFunction, ParsedTypeSet } from "./parse.js"
import {
    ElementOf,
    StringifyPossibleTypes,
    MergeAll,
    DiffUnions,
    UnionDiffResult,
    Cast
} from "@re-do/utils"
import { Validate } from "./definition.js"
import { Obj, Recursible, Root, Str } from "./components"

export type TypeDefinitions<
    Definitions,
    DeclaredTypeName extends string = keyof MergeAll<Definitions> & string
> = {
    [Index in keyof Definitions]: Validate<Definitions[Index], DeclaredTypeName>
}

export type TypeSet<
    Set,
    ExternalTypeName extends string = never,
    TypeNames extends string = (keyof Set | ExternalTypeName) & string
> = {
    [TypeName in keyof Set]: Validate<Set[TypeName], TypeNames>
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
            ? Validate<Definitions[Index], TypeNameFrom<Definitions>>
            : `Definitions must be objects with string keys representing defined type names.`
    }

export const createCompileFunction =
    <DeclaredTypeNames extends string[]>(names: Narrow<DeclaredTypeNames>) =>
    <
        Definitions,
        MergedTypeSet extends UnvalidatedTypeSet = TypeSetFromDefinitions<Definitions>
    >(
        // @ts-ignore
        ...definitions: Narrow<
            [] extends DeclaredTypeNames
                ? TypeSetDefinitions<Definitions>
                : TypeSetDefinitions<Definitions, ElementOf<DeclaredTypeNames>>
        >
    ) => {
        const typeSetFromDefinitions = formatTypes(
            mergeAll(definitions as any)
        ) as MergedTypeSet
        const parse = createParseFunction(typeSetFromDefinitions)
        return {
            parse,
            types: transform(
                typeSetFromDefinitions as any,
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

export type CompileFunction<DeclaredTypeNames extends string[] = []> = <
    Definitions extends any[]
>(
    definitions: [] extends DeclaredTypeNames
        ? TypeSetDefinitions<Definitions>
        : TypeSetDefinitions<Definitions, ElementOf<DeclaredTypeNames>>
) => CompiledTypeSet<Definitions>

export type CompiledTypeSet<
    Definitions extends Recursible.Definition[] = Recursible.Definition[],
    MergedTypeSet extends UnvalidatedTypeSet = Recursible.Definition[] extends Definitions
        ? UnvalidatedTypeSet
        : TypeSetFromDefinitions<Definitions>
> = {
    parse: ParseFunction<MergedTypeSet>
    types: ParsedTypeSet<MergedTypeSet>
}
