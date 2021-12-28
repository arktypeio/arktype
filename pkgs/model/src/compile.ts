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
    IsAny,
    Exact
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
    ): CompileFunction<DeclaredTypeNames> =>
    (definitions) => {
        // if (
        //     !Array.isArray(definitions) ||
        //     definitions.some((def) => !isRecursible(def) || Array.isArray(def))
        // ) {
        //     throw new Error(`Compile args must be a list of names mapped to their corresponding definitions
        //     passed as rest args, e.g.:
        //     compile(
        //         { user: { name: "string" } },
        //         { group: "user[]" }
        //     )`)
        // }
        // const definitions = mergeAll(definitions as any) as any
        const declarationErrors = diffSets(
            declaredTypeNames,
            Object.keys(definitions)
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
        const define = createDefineFunction(definitions) as any
        return {
            ...(transform(definitions, ([typeName, definition]) => [
                typeName,
                // @ts-ignore
                define(definition, {
                    // @ts-ignore
                    space: definitions
                })
            ]) as any),
            types: typeDefProxy,
            define
        }
    }

// Exported compile function is equivalent to compile from an empty declare call
// and will not validate missing or extraneous definitions
export const compile = createCompileFunction([])

// export type TypeNameFromList<Definitions> = keyof MergeAll<Definitions> & string

export type CheckCompileDefinitions<
    Definitions,
    DeclaredTypeNames extends string[] = [],
    Checked = CheckSpaceResolutions<Definitions>,
    DefinedTypeName extends string = keyof Checked & string,
    DeclaredTypeName extends string = DeclaredTypeNames extends never[]
        ? DefinedTypeName
        : ElementOf<DeclaredTypeNames>
> = {
    [TypeName in DeclaredTypeName]: KeyValuate<Checked, TypeName>
}

// export type CheckCompileArgs<
//     Definitions,
//     DeclaredTypeNames extends string[] = [],
//     Merged = CheckSpaceResolutions<MergeAll<Definitions>>,
//     DefinedTypeName extends string = keyof Merged & string,
//     DeclaredTypeName extends string = DeclaredTypeNames extends never[]
//         ? DefinedTypeName
//         : ElementOf<DeclaredTypeNames>,
//     ErrorMessage extends string = MissingTypesError<
//         DeclaredTypeName,
//         DefinedTypeName
//     >
// > = {
//     [I in keyof Definitions]: ErrorMessage & {
//         [TypeName in keyof Definitions[I]]: TypeName extends DeclaredTypeName
//             ? KeyValuate<Merged, TypeName>
//             : `${TypeName & string} was never declared.`
//     }
// }

export const extraneousTypesErrorMessage = `Defined types @types were never declared.`
export const missingTypesErrorMessage = `Declared types @types were never defined.`

// export type MissingTypesError<DeclaredTypeName, DefinedTypeName> = DiffUnions<
//     DeclaredTypeName,
//     DefinedTypeName
//     // Extraneous definition errors are handled by CheckSpaceArgs
// > extends UnionDiffResult<infer Extraneous, infer Missing>
//     ? Missing extends []
//         ? {}
//         : StringReplace<
//               typeof missingTypesErrorMessage,
//               "@types",
//               StringifyPossibleTypes<`'${ElementOf<Missing>}'`>
//           >
//     : never

export type CompileFunction<DeclaredTypeNames extends string[]> = <Definitions>(
    definitions: Narrow<
        Exact<
            Definitions,
            CheckCompileDefinitions<Definitions, DeclaredTypeNames>
        >
    >
) => Space<Definitions>

const result = compile({ a: "string", b: { c: "number" } })

export type Space<Definitions> = Evaluate<
    ParseSpaceResolutions<Definitions, DefaultParseTypeOptions> & {
        types: Evaluate<
            Map.Parse<Definitions, Definitions, DefaultParseTypeOptions>
        >
        define: DefineFunction<Definitions>
    }
>
