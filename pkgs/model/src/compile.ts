import {
    diffSets,
    DiffUnions,
    ElementOf,
    Evaluate,
    isRecursible,
    KeyValuate,
    MergeAll,
    mergeAll,
    Narrow,
    StringifyPossibleTypes,
    StringReplace,
    transform,
    UnionDiffResult,
    IsAny
} from "@re-/tools"
import {
    createDefineFunction,
    DefineFunction,
    DefaultParseTypeOptions,
    Parse,
    Model
} from "./model.js"
import { Map, Root } from "./definitions"
import { typeDefProxy, ParseConfig } from "./internal.js"
import { Resolution } from "./resolution.js"

export type SpaceResolutions = Record<string, Root.Definition>

export type CheckSpaceResolutions<Space> = IsAny<Space> extends true
    ? any
    : Evaluate<{
          [TypeName in keyof Space]: Resolution.Check<Space[TypeName], Space>
      }>

export type ParseSpaceRoot<Space, Options extends ParseConfig> = {
    [TypeName in keyof Space]: Parse<
        Space[TypeName],
        CheckSpaceResolutions<Space>,
        Options
    >
}

export type ParseSpaceResolutions<Space, Options extends ParseConfig> = {
    [TypeName in keyof Space]: Model<
        Space[TypeName],
        CheckSpaceResolutions<Space>,
        Options
    >
}

export const createCompileFunction =
    <DeclaredTypeNames extends string[]>(
        declaredTypeNames: Narrow<DeclaredTypeNames>
    ) =>
    <Definitions extends CheckSpaceArgs<Definitions, DeclaredTypeNames>>(
        // @ts-ignore
        ...definitions: Narrow<Definitions>
    ) => {
        if (
            !Array.isArray(definitions) ||
            definitions.some((def) => !isRecursible(def) || Array.isArray(def))
        ) {
            throw new Error(`Compile args must be a list of names mapped to their corresponding definitions
            passed as rest args, e.g.:
            compile(
                { user: { name: "string" } },
                { group: "user[]" }
            )`)
        }
        const spaceFromDefinitions = mergeAll(definitions as any) as any
        const declarationErrors = diffSets(
            declaredTypeNames,
            Object.keys(spaceFromDefinitions)
        )
        if (declaredTypeNames.length && declarationErrors) {
            const errorParts = [] as string[]
            if (declarationErrors.added) {
                errorParts.push(
                    extraneousTypesErrorMessage.replace(
                        "@types",
                        declarationErrors.added.map((_) => `'${_}'`).join(", ")
                    )
                )
            }
            if (declarationErrors.removed) {
                errorParts.push(
                    missingTypesErrorMessage.replace(
                        "@types",
                        declarationErrors.removed
                            .map((_) => `'${_}'`)
                            .join(", ")
                    )
                )
            }
            throw new Error(errorParts.join(" "))
        }
        const define = createDefineFunction(spaceFromDefinitions) as any
        return {
            ...(transform(spaceFromDefinitions, ([typeName, definition]) => [
                typeName,
                // @ts-ignore
                define(definition, {
                    // @ts-ignore
                    space: spaceFromDefinitions
                })
            ]) as any),
            types: typeDefProxy,
            define
        } as Space<Definitions>
    }

// Exported compile function is equivalent to compile from an empty declare call
// and will not validate missing or extraneous definitions
export const compile = createCompileFunction([])

export type TypeNameFromList<Definitions> = keyof MergeAll<Definitions> & string

export type CheckSpaceArgs<
    Definitions,
    DeclaredTypeNames extends string[] = [],
    Merged = CheckSpaceResolutions<MergeAll<Definitions>>,
    DefinedTypeName extends string = keyof Merged & string,
    DeclaredTypeName extends string = DeclaredTypeNames extends never[]
        ? DefinedTypeName
        : ElementOf<DeclaredTypeNames>,
    ErrorMessage extends string = MissingTypesError<
        DeclaredTypeName,
        DefinedTypeName
    >
> = {
    [I in keyof Definitions]: ErrorMessage & {
        [TypeName in keyof Definitions[I]]: TypeName extends DeclaredTypeName
            ? KeyValuate<Merged, TypeName>
            : `${TypeName & string} was never declared.`
    }
}

export const extraneousTypesErrorMessage = `Defined types @types were never declared.`
export const missingTypesErrorMessage = `Declared types @types were never defined.`

export type MissingTypesError<DeclaredTypeName, DefinedTypeName> = DiffUnions<
    DeclaredTypeName,
    DefinedTypeName
    // Extraneous definition errors are handled by CheckSpaceArgs
> extends UnionDiffResult<infer Extraneous, infer Missing>
    ? Missing extends []
        ? {}
        : StringReplace<
              typeof missingTypesErrorMessage,
              "@types",
              StringifyPossibleTypes<`'${ElementOf<Missing>}'`>
          >
    : never

export type CompileFunction<DeclaredTypeNames extends string[]> = <
    Definitions extends CheckSpaceArgs<Definitions, DeclaredTypeNames>
>(
    // @ts-ignore
    ...definitions: Narrow<Definitions>
) => Space<Definitions>

export type Space<Definitions, MergedSpace = MergeAll<Definitions>> = Evaluate<
    ParseSpaceResolutions<MergedSpace, DefaultParseTypeOptions> & {
        types: Evaluate<
            Map.Parse<MergedSpace, MergedSpace, DefaultParseTypeOptions>
        >
        define: DefineFunction<MergedSpace>
    }
>
