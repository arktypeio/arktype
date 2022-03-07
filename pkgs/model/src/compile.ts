import {
    diffSets,
    ElementOf,
    Evaluate,
    KeyValuate,
    Narrow,
    transform,
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
import { Map, Root } from "./definitions/index.js"
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

export type CheckCompileDefinitions<
    Definitions,
    DeclaredTypeNames extends string[] = [],
    Checked = CheckSpaceResolutions<Definitions>,
    DefinedTypeName extends string = keyof Checked & string,
    DeclaredTypeName extends string = DeclaredTypeNames extends never[]
        ? DefinedTypeName
        : ElementOf<DeclaredTypeNames>
> = Evaluate<{
    [TypeName in DeclaredTypeName]: KeyValuate<Checked, TypeName>
}>

export const extraneousTypesErrorMessage = `Defined types @types were never declared.`
export const missingTypesErrorMessage = `Declared types @types were never defined.`

export type CompileFunction<DeclaredTypeNames extends string[]> = <Definitions>(
    definitions: Narrow<
        Exact<
            Definitions,
            CheckCompileDefinitions<Definitions, DeclaredTypeNames>
        >
    >
) => Space<Definitions>

export type Space<Definitions> = Evaluate<
    ParseSpaceResolutions<Definitions, DefaultParseTypeOptions> & {
        types: Evaluate<
            Map.Parse<Definitions, Definitions, DefaultParseTypeOptions>
        >
        define: DefineFunction<Definitions>
    }
>
