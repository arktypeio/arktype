import {
    diffSets,
    ElementOf,
    Evaluate,
    KeyValuate,
    Narrow,
    transform,
    IsAny,
    Exact,
    Merge
} from "@re-/tools"
import {
    createCreateFunction,
    CreateFunction,
    DefaultParseTypeOptions,
    TypeOf,
    Model
} from "./create.js"
import { Map, Root } from "./definitions/index.js"
import { typeDefProxy, ParseConfig } from "./internal.js"
import { Resolution } from "./resolution.js"
import { DefaultParseTypeContext } from "./definitions/internal.js"

export type SpaceResolutions = Record<string, Root.Definition>

export type CheckSpaceResolutions<
    Space,
    SuperSpace = {}
> = IsAny<Space> extends true
    ? any
    : Evaluate<{
          [TypeName in keyof Space]: Resolution.Check<
              Space[TypeName],
              Merge<SuperSpace, Space>
          >
      }>

export type ParseSpaceRoot<Space, Options extends ParseConfig> = {
    [TypeName in keyof Space]: TypeOf<
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
        const create = createCreateFunction(definitions) as any
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
            create
        }
    }

// Exported compile function is equivalent to compile from an empty declare call
// and will not validate missing or extraneous definitions
export const compile = createCompileFunction([])

export type CheckCompileDefinitions<
    Definitions,
    DeclaredTypeNames extends string[] = [],
    SuperSpace = {},
    Checked = CheckSpaceResolutions<Definitions, SuperSpace>,
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

export type ExtendSpace<SuperSpace> = <Definitions>(
    definitions: Narrow<
        Exact<Definitions, CheckCompileDefinitions<Definitions, [], SuperSpace>>
    >
) => Space<Merge<SuperSpace, Definitions>>

export type Space<Definitions> = Evaluate<
    ParseSpaceResolutions<Definitions, DefaultParseTypeOptions> & {
        types: Evaluate<
            Map.TypeOf<
                Map.Parse<Definitions, Definitions, DefaultParseTypeContext>,
                Definitions,
                DefaultParseTypeOptions
            >
        >
        create: CreateFunction<Definitions>
        extend: ExtendSpace<Definitions>
        // TODO: Add declare extension
    }
>
