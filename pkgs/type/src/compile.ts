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
    UnionDiffResult
} from "@re-/utils"
import {
    createParseFunction,
    ParseFunction,
    DefaultParseTypeOptions
} from "./parse.js"
import { TypeSpace } from "./typespace"
import { Map } from "./definition"
import { typeDefProxy } from "./internal.js"

export const createCompileFunction =
    <DeclaredTypeNames extends string[]>(
        declaredTypeNames: Narrow<DeclaredTypeNames>
    ) =>
    <Definitions extends ValidateCompilation<Definitions, DeclaredTypeNames>>(
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
        const parse = createParseFunction(typespaceFromDefinitions) as any
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
            parse
        } as CompiledTypespace<Definitions>
    }

// Exported compile function is equivalent to compile from an empty declare call
// and will not validate missing or extraneous definitions
export const compile = createCompileFunction([])

export type TypeNameFromList<Definitions> = keyof MergeAll<Definitions> & string

export type ValidateCompilation<
    Definitions,
    DeclaredTypeNames extends string[] = [],
    Merged = TypeSpace.Validate<MergeAll<Definitions>>,
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
    // Extraneous definition errors are handled by ValidateMemberList
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
    Definitions extends ValidateCompilation<Definitions, DeclaredTypeNames>
>(
    // @ts-ignore
    ...definitions: Narrow<Definitions>
) => CompiledTypespace<Definitions>

export type CompiledTypespace<
    Definitions,
    MergedTypespace = MergeAll<Definitions>
> = Evaluate<
    TypeSpace.ParseEach<MergedTypespace, DefaultParseTypeOptions> & {
        types: Map.Parse<
            MergedTypespace,
            MergedTypespace,
            DefaultParseTypeOptions
        >
        parse: ParseFunction<MergedTypespace>
    }
>
