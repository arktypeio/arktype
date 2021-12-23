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
    createModelFunction,
    ModelFunction,
    DefaultParseTypeOptions,
    Parse
} from "./model.js"
import { Map } from "./definitions"
import { typeDefProxy } from "./internal.js"
import { Model } from "./model.js"
import { ParseConfig } from "./internal.js"
import { Resolution } from "./resolution.js"
import { Root } from "./definitions"

export type TypespaceResolutions = Record<string, Root.Definition>

export type CheckTypespaceResolutions<Typespace> = IsAny<Typespace> extends true
    ? any
    : Evaluate<{
          [TypeName in keyof Typespace]: Resolution.Check<
              Typespace[TypeName],
              Typespace
          >
      }>

export type ParseTypespaceRoot<Typespace, Options extends ParseConfig> = {
    [TypeName in keyof Typespace]: Parse<
        Typespace[TypeName],
        CheckTypespaceResolutions<Typespace>,
        Options
    >
}

export type ParseTypespaceResolutions<
    Typespace,
    Options extends ParseConfig
> = {
    [TypeName in keyof Typespace]: Model<
        Typespace[TypeName],
        CheckTypespaceResolutions<Typespace>,
        Options
    >
}

export const createTypespaceFunction =
    <DeclaredTypeNames extends string[]>(
        declaredTypeNames: Narrow<DeclaredTypeNames>
    ) =>
    <Definitions extends CheckTypespaceArgs<Definitions, DeclaredTypeNames>>(
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
        const typespaceFromDefinitions = mergeAll(definitions as any) as any
        const declarationErrors = diffSets(
            declaredTypeNames,
            Object.keys(typespaceFromDefinitions)
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
        const model = createModelFunction(typespaceFromDefinitions) as any
        return {
            ...(transform(
                typespaceFromDefinitions,
                ([typeName, definition]) => [
                    typeName,
                    // @ts-ignore
                    parse(definition, {
                        // @ts-ignore
                        typespace: typespaceFromDefinitions
                    })
                ]
            ) as any),
            types: typeDefProxy,
            model
        } as Typespace<Definitions>
    }

// Exported compile function is equivalent to compile from an empty declare call
// and will not validate missing or extraneous definitions
export const typespace = createTypespaceFunction([])

export type TypeNameFromList<Definitions> = keyof MergeAll<Definitions> & string

export type CheckTypespaceArgs<
    Definitions,
    DeclaredTypeNames extends string[] = [],
    Merged = CheckTypespaceResolutions<MergeAll<Definitions>>,
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
    // Extraneous definition errors are handled by CheckTypespaceArgs
> extends UnionDiffResult<infer Extraneous, infer Missing>
    ? Missing extends []
        ? {}
        : StringReplace<
              typeof missingTypesErrorMessage,
              "@types",
              StringifyPossibleTypes<`'${ElementOf<Missing>}'`>
          >
    : never

export type TypespaceFunction<DeclaredTypeNames extends string[]> = <
    Definitions extends CheckTypespaceArgs<Definitions, DeclaredTypeNames>
>(
    // @ts-ignore
    ...definitions: Narrow<Definitions>
) => Typespace<Definitions>

export type Typespace<
    Definitions,
    MergedTypespace = MergeAll<Definitions>
> = Evaluate<
    ParseTypespaceResolutions<MergedTypespace, DefaultParseTypeOptions> & {
        types: Evaluate<
            Map.Parse<MergedTypespace, MergedTypespace, DefaultParseTypeOptions>
        >
        model: ModelFunction<MergedTypespace>
    }
>
