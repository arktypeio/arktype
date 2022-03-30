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
    ModelConfig,
    ParseOptions,
    DefaultParseOptions,
    create
} from "./model.js"
import { Map, Root } from "./definitions/index.js"
import {
    DefaultTypeOfContext,
    typeDefProxy,
    TypeOfContext
} from "./internal.js"
import { ValidateResolution } from "./resolution.js"
import { DefaultParseTypeContext } from "./definitions/internal.js"

export type SpaceResolutions = Record<string, Root.Definition>

export type SpaceConfig<Resolutions extends SpaceResolutions> = ModelConfig & {
    models?: {
        [Name in keyof Resolutions & string]?: ModelConfig
    }
}

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

export type ParseSpaceRoot<Space, Context extends TypeOfContext<Space>> = {
    [TypeName in keyof Space]: TypeOf<
        Space[TypeName],
        ValidateSpaceResolutions<Space>,
        Context
    >
}

export type ParseSpaceResolutions<Resolutions, Config> = Evaluate<{
    [TypeName in keyof Resolutions]: Model<
        Resolutions[TypeName],
        {
            resolutions: ValidateSpaceResolutions<Resolutions>
            config: Config
        },
        DefaultParseOptions
    >
}>

export const createCompileFunction =
    <DeclaredTypeNames extends string[]>(
        declaredTypeNames: Narrow<DeclaredTypeNames>
    ): CompileFunction<DeclaredTypeNames> =>
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
                create(definition, {
                    space: { resolutions, config }
                })
            ]),
            types: typeDefProxy,
            create,
            extend
        } as any
    }

// Exported compile function is equivalent to compile from an empty declare call
// and will not validate missing or extraneous definitions
export const compile = createCompileFunction([])

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
    Resolutions extends SpaceResolutions,
    ModelName extends string = keyof Resolutions & string
> = ModelConfig & {
    models?: {
        [Name in ModelName]?: ModelConfig
    }
}

export type ExtractTypeSpaceOptions<
    Options extends SpaceOptions<SpaceResolutions>
> = TypeSpaceOptions<string> &
    (Options["parse"] extends ParseOptions ? Options["parse"] : {}) & {
        models: {
            [Name in keyof Options["models"]]: KeyValuate<
                Options["models"][Name],
                "parse"
            >
        }
    }

export type TypeSpaceOptions<ModelName extends string> = ParseOptions & {
    models?: {
        [Name in ModelName]?: ParseOptions
    }
}

export type CompileFunction<DeclaredTypeNames extends string[]> = <
    Resolutions extends SpaceResolutions,
    Options extends SpaceOptions<Resolutions> = {}
>(
    resolutions: Narrow<
        Exact<
            Resolutions,
            CheckCompileResolutions<Resolutions, DeclaredTypeNames>
        >
    >,
    config?: Narrow<Options>
) => Space<Resolutions, Options>

type ExtendSpaceConfig<OriginalConfig, NewConfig> = Merge<
    Merge<OriginalConfig, NewConfig>,
    {
        models: Merge<
            KeyValuate<OriginalConfig, "models">,
            KeyValuate<NewConfig, "models">
        >
    }
>

type ExtendSpaceFunction<
    OriginalResolutions extends SpaceResolutions,
    OriginalConfig
> = <
    NewResolutions extends SpaceResolutions,
    NewConfig extends SpaceOptions<MergedResolutions>,
    MergedResolutions extends SpaceResolutions = Merge<
        OriginalResolutions,
        NewResolutions
    >
>(
    definitions: Narrow<
        Exact<
            NewResolutions,
            CheckCompileResolutions<NewResolutions, [], OriginalResolutions>
        >
    >,
    config?: Narrow<NewConfig>
) => Space<MergedResolutions, ExtendSpaceConfig<OriginalConfig, NewConfig>>

export type Spacefication<
    Resolutions extends SpaceResolutions = SpaceResolutions,
    Config = SpaceOptions<Resolutions>
> = {
    resolutions: Resolutions
    config?: Config
}

export type Space<Resolutions extends SpaceResolutions, Config> = Evaluate<{
    resolutions: Resolutions
    config: Config
    models: ParseSpaceResolutions<Resolutions, Config>
    types: Evaluate<
        Map.TypeOf<
            Map.Parse<Resolutions, Resolutions, DefaultParseTypeContext>,
            Resolutions,
            DefaultTypeOfContext
        >
    >
    create: CreateFunction<{ resolutions: Resolutions; config: Config }>
    extend: ExtendSpaceFunction<Resolutions, Config>
    // TODO: Add declare extension
}>
