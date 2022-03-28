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
    TypeOf,
    Model,
    ModelOptions
} from "./model.js"
import { Map, Root } from "./definitions/index.js"
import {
    DefaultTypeOfContext,
    typeDefProxy,
    TypeOfContext
} from "./internal.js"
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

export type ParseSpaceRoot<Space, Context extends TypeOfContext> = {
    [TypeName in keyof Space]: TypeOf<
        Space[TypeName],
        CheckSpaceResolutions<Space>,
        Context
    >
}

export type ParseSpaceResolutions<Space, Context extends TypeOfContext> = {
    [TypeName in keyof Space]: Model<
        Space[TypeName],
        CheckSpaceResolutions<Space>,
        Context
    >
}

export const createCompileFunction =
    <DeclaredTypeNames extends string[]>(
        declaredTypeNames: Narrow<DeclaredTypeNames>
    ): CompileFunction<DeclaredTypeNames> =>
    (definitions: any, config: any) => {
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
        const create = createCreateFunction(definitions)
        const extend = (extensionDefinitions: any, extensionConfig: any) =>
            compile(
                { ...definitions, ...extensionDefinitions },
                {
                    ...config,
                    ...extensionConfig,
                    models: { ...config?.models, ...extensionConfig?.models }
                }
            )
        return {
            models: transform(definitions, ([typeName, definition]) => [
                typeName,
                create(definition, {
                    space: definitions
                })
            ]),
            types: typeDefProxy,
            create,
            config,
            extend
        } as any
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

export type SpaceOptions<ModelName extends string> = ModelOptions & {
    models?: {
        [Name in ModelName]?: ModelOptions
    }
}

export type CompileFunction<DeclaredTypeNames extends string[]> = <
    Definitions,
    Options extends SpaceOptions<keyof Definitions & string>
>(
    definitions: Narrow<
        Exact<
            Definitions,
            CheckCompileDefinitions<Definitions, DeclaredTypeNames>
        >
    >,
    config?: Narrow<Options>
) => Space<Definitions, Options>

type ExtendSpaceConfig<OriginalConfig, NewConfig> = Merge<
    Merge<OriginalConfig, NewConfig>,
    {
        models: Merge<
            KeyValuate<OriginalConfig, "models">,
            KeyValuate<NewConfig, "models">
        >
    }
>

type ExtendSpaceFunction<ExtendedDefinitions, ExtendedContext> = <
    Definitions,
    Config extends SpaceOptions<
        (keyof ExtendedDefinitions | keyof Definitions) & string
    >
>(
    definitions: Narrow<
        Exact<
            Definitions,
            CheckCompileDefinitions<Definitions, [], ExtendedDefinitions>
        >
    >,
    config?: Narrow<Config>
) => Space<
    Merge<ExtendedDefinitions, Definitions>,
    ExtendSpaceConfig<ExtendedContext, Config>
>

export type Space<Definitions, Config> = Evaluate<{
    models: ParseSpaceResolutions<Definitions, DefaultTypeOfContext>
    types: Evaluate<
        Map.TypeOf<
            Map.Parse<Definitions, Definitions, DefaultParseTypeContext>,
            Definitions,
            DefaultTypeOfContext
        >
    >
    create: CreateFunction<Definitions>
    extend: ExtendSpaceFunction<Definitions, Config>
    config: Config
    // TODO: Add declare extension
}>
