import {
    diffSets,
    ElementOf,
    Evaluate,
    KeyValuate,
    Narrow,
    transform,
    IsAny,
    Exact,
    Get
} from "@re-/tools"
import {
    createCreateFunction,
    Model,
    ModelConfig,
    DefaultParseOptions,
    CustomValidator,
    CreateFunction
} from "./model.js"
import { Map, Root } from "./definitions/index.js"
import { DefaultTypeOfContext, typeDefProxy, Merge } from "./internal.js"
// import { ValidateResolution } from "./resolution.js"
import { DefaultParseTypeContext } from "./definitions/internal.js"

export type SpaceResolutions = Record<string, any>

export type NodesToModels<
    Nodes,
    Resolutions,
    Config,
    ConfigWithDefaults = Merge<DefaultParseOptions, Config>
> = {
    [TypeName in keyof Nodes]: Model<
        Nodes[TypeName],
        {
            resolutions: Resolutions
            config: { parse: Config }
        },
        ConfigWithDefaults & { seen: { [K in TypeName]: true } }
    >
}

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
            // @ts-ignore
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
                // @ts-ignore
                create(definition, { ...config, ...config?.models?.[typeName] })
            ]),
            types: typeDefProxy,
            create,
            extend
        } as any
    }

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

// type ExtendSpaceConfig<OriginalConfig, NewConfig> = Merge<
//     Merge<OriginalConfig, NewConfig>,
//     {
//         models: Merge<
//             KeyValuate<OriginalConfig, "models">,
//             KeyValuate<NewConfig, "models">
//         >
//     }
// >

// type ExtendSpaceFunction<OriginalResolutions, OriginalConfig> = <
//     NewResolutions,
//     NewConfig extends SpaceOptions<MergedResolutions>,
//     MergedResolutions = Merge<OriginalResolutions, NewResolutions>
// >(
//     definitions: Narrow<
//         Exact<
//             NewResolutions,
//             CheckCompileResolutions<NewResolutions, [], OriginalResolutions>
//         >
//     >,
//     config?: Narrow<NewConfig>
// ) => Space<MergedResolutions, ExtendSpaceConfig<OriginalConfig, NewConfig>>

export type SpaceDefinition<
    Resolutions = SpaceResolutions,
    Config = SpaceOptions<Resolutions>
> = {
    resolutions: Resolutions
    config?: Config
}

export type Space<
    Nodes,
    Resolutions,
    Config,
    SpaceParseConfig = KeyValuate<Config, "parse"> extends undefined
        ? {}
        : KeyValuate<Config, "parse">
> = Evaluate<{
    resolutions: Resolutions
    config: Config
    types: Evaluate<{
        [TypeName in keyof Nodes]: Root.TypeOf<
            Nodes[TypeName],
            Nodes,
            DefaultTypeOfContext
        >
    }>
    models: NodesToModels<Nodes, Resolutions, SpaceParseConfig>
    nodes: Nodes
    // @ts-ignore
    create: CreateFunction<{
        resolutions: Resolutions
        config: Config
        nodes: Nodes
    }>
    // extend: ExtendSpaceFunction<Resolutions, Config>
    // TODO: Add declare extension
}>

export type CheckCompileResolutions<
    Resolutions,
    Nodes,
    DeclaredTypeNames extends string[] = [],
    Checked = ValidateSpaceResolutions<Nodes>,
    DefinedTypeName extends string = keyof Checked & string,
    DeclaredTypeName extends string = DeclaredTypeNames extends never[]
        ? DefinedTypeName
        : ElementOf<DeclaredTypeNames>
> = IsAny<Resolutions> extends true
    ? Resolutions
    : {
          [TypeName in DeclaredTypeName]: KeyValuate<Checked, TypeName>
      }

export type ValidateSpaceResolutions<Nodes> = {
    [TypeName in keyof Nodes]: Root.Validate<Nodes[TypeName]>
}

export type ResolutionsToNodes<Resolutions> = {
    [TypeName in keyof Resolutions]: Root.Parse<
        Resolutions[TypeName],
        Resolutions,
        DefaultParseTypeContext
    >
}

export type CompileFunction<DeclaredTypeNames extends string[]> = <
    Resolutions,
    Options extends SpaceOptions<Resolutions> = {},
    Nodes = {
        [TypeName in keyof Resolutions]: Root.Parse<
            Resolutions[TypeName],
            Resolutions,
            DefaultParseTypeContext
        >
    }
>(
    resolutions: Narrow<
        CheckCompileResolutions<Resolutions, Nodes, DeclaredTypeNames>
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
) => Space<Nodes, Resolutions, Options>

// Exported compile function is equivalent to compile from an empty declare call
// and will not validate missing or extraneous definitions
export const compile = createCompileFunction([])

const space = compile({
    a: {
        ok: "string"
    },
    b: {
        cool: "number|bigint"
    }
})
