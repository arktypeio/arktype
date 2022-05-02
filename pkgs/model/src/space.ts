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
    createCreateFunction,
    CreateFunction,
    Model,
    ModelConfig,
    DefaultParseOptions,
    CustomValidator
} from "./model.js"
import { Map, Root } from "./definitions/index.js"
import { DefaultTypeOfContext, typeDefProxy, Merge } from "./internal.js"
import { ValidateResolution } from "./resolution.js"
import { DefaultParseTypeContext } from "./definitions/internal.js"

export type SpaceResolutions = Record<string, any>

export type ValidateSpaceResolutions<
    Resolutions,
    SuperSpaceResolutions = {}
> = IsAny<Resolutions> extends true
    ? any
    : Evaluate<{
          [TypeName in keyof Resolutions]: ValidateResolution<
              Resolutions[TypeName],
              Merge<SuperSpaceResolutions, Resolutions>
          >
      }>

export type ResolutionsToModels<
    Resolutions,
    Config,
    ConfigWithDefaults = Merge<DefaultParseOptions, Config>
> = Evaluate<{
    [TypeName in keyof Resolutions]: Model<
        Resolutions[TypeName],
        {
            resolutions: ValidateSpaceResolutions<Resolutions>
            config: { parse: Config }
        },
        ConfigWithDefaults & { seen: { [K in TypeName]: true } }
    >
}>

export type CreateCompileFunction = <DeclaredTypeNames extends string[]>(
    declaredTypeNames: Narrow<DeclaredTypeNames>
) => CompileFunction<DeclaredTypeNames>

export const createCompileFunction: CreateCompileFunction =
    (declaredTypeNames) =>
    (resolutions: any, config: any = {}) => {
        const declarationErrors = diffSets(
            declaredTypeNames,
            Object.keys(resolutions)
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
        const create = createCreateFunction({ resolutions, config })
        const extend = (newDefinitions: any, newConfig: any) =>
            compile(
                { ...resolutions, ...newDefinitions },
                {
                    ...config,
                    ...newConfig,
                    models: { ...config?.models, ...newConfig?.models }
                }
            )
        return {
            resolutions,
            config,
            models: transform(resolutions, ([typeName, definition]) => [
                typeName,
                create(definition, { ...config, ...config?.models?.[typeName] })
            ]),
            types: typeDefProxy,
            create,
            extend
        } as any
    }

export type CheckCompileResolutions<
    Resolutions,
    DeclaredTypeNames extends string[] = [],
    SuperSpaceResolutions = {},
    Checked = ValidateSpaceResolutions<Resolutions, SuperSpaceResolutions>,
    DefinedTypeName extends string = keyof Checked & string,
    DeclaredTypeName extends string = DeclaredTypeNames extends never[]
        ? DefinedTypeName
        : ElementOf<DeclaredTypeNames>
> = Evaluate<{
    [TypeName in DeclaredTypeName]: KeyValuate<Checked, TypeName>
}>

export const extraneousTypesErrorMessage = `Defined types @types were never declared.`
export const missingTypesErrorMessage = `Declared types @types were never defined.`

export type SpaceOptions<
    Resolutions,
    ModelName extends string = keyof Resolutions & string
> = ModelConfig & {
    models?: {
        [Name in ModelName]?: Omit<ModelConfig, "parse">
    }
}

type ExtendSpaceConfig<OriginalConfig, NewConfig> = Merge<
    Merge<OriginalConfig, NewConfig>,
    {
        models: Merge<
            KeyValuate<OriginalConfig, "models">,
            KeyValuate<NewConfig, "models">
        >
    }
>

type ExtendSpaceFunction<OriginalResolutions, OriginalConfig> = <
    NewResolutions,
    NewConfig extends SpaceOptions<MergedResolutions>,
    MergedResolutions = Merge<OriginalResolutions, NewResolutions>
>(
    definitions: Narrow<
        Exact<
            NewResolutions,
            CheckCompileResolutions<NewResolutions, [], OriginalResolutions>
        >
    >,
    config?: Narrow<NewConfig>
) => Space<MergedResolutions, ExtendSpaceConfig<OriginalConfig, NewConfig>>

export type SpaceDefinition<
    Resolutions = SpaceResolutions,
    Config = SpaceOptions<Resolutions>
> = {
    resolutions: Resolutions
    config?: Config
}

export type Space<
    Resolutions,
    Config,
    SpaceParseConfig = KeyValuate<Config, "parse"> extends undefined
        ? {}
        : KeyValuate<Config, "parse">
> = Evaluate<{
    resolutions: Resolutions
    config: Config
    models: ResolutionsToModels<Resolutions, SpaceParseConfig>
    types: Evaluate<{
        [TypeName in keyof Resolutions]: Root.TypeOf<
            Root.Parse<
                Resolutions[TypeName],
                Resolutions,
                DefaultParseTypeContext
            >,
            Resolutions,
            DefaultTypeOfContext
        >
    }>
    // @ts-ignore
    create: CreateFunction<{
        resolutions: Resolutions
        config: Config
    }>
    extend: ExtendSpaceFunction<Resolutions, Config>
    // TODO: Add declare extension
}>

export type CompileFunction<DeclaredTypeNames extends string[]> = <
    Resolutions,
    Options extends SpaceOptions<Resolutions> = {}
>(
    resolutions: Narrow<
        Exact<
            Resolutions,
            CheckCompileResolutions<Resolutions, DeclaredTypeNames>
        >
    >,
    // TS has a problem inferring the narrowed type of a function hence the intersection hack
    // If removing it doesn't break any types or tests, do it!
    config?: Narrow<
        Options & {
            validate?: { validator?: CustomValidator }
            models?: {
                [Name in keyof Resolutions]?: Omit<ModelConfig, "parse">
            }
        }
    >
) => Space<Resolutions, Options>

// Exported compile function is equivalent to compile from an empty declare call
// and will not validate missing or extraneous definitions
export const compile = createCompileFunction([])
