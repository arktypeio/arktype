import {
    diffSets,
    ElementOf,
    Evaluate,
    KeyValuate,
    Narrow,
    transform,
    IsAny,
    narrow,
    Exact
} from "@re-/tools"
import {
    createCreateFunction,
    Model,
    ModelConfig,
    DefaultParseOptions,
    CreateFunction
} from "./model.js"
import { Root } from "./definitions/index.js"
import { DefaultTypeOfContext, typeDefProxy, Merge } from "./internal.js"

export type DictionaryToModels<
    Dict,
    Config,
    ConfigWithDefaults = Merge<DefaultParseOptions, Config>
> = {
    [TypeName in keyof Dict]: Model<
        Dict[TypeName],
        {
            dictionary: Dict
            config: { parse: Config }
        },
        ConfigWithDefaults & { seen: { [K in TypeName]: true } }
    >
}

export const compile: CompileFunction = (dictionary: any, config: any = {}) => {
    if (config.declaredTypeNames) {
        const declarationErrors = diffSets(
            config.declaredTypeNames,
            Object.keys(dictionary)
        )
        if (declarationErrors) {
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
    }
    const create = createCreateFunction({ dictionary, config })
    const extend = (newDefinitions: any, newConfig: any) =>
        // @ts-ignore
        compile(
            { ...dictionary, ...newDefinitions },
            {
                ...config,
                ...newConfig,
                models: { ...config?.models, ...newConfig?.models }
            }
        )
    return {
        dictionary,
        config,
        models: transform(dictionary, ([typeName, definition]) => [
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

export interface SpaceConfig<Dict> extends ModelConfig {
    models?: {
        [Name in keyof Dict]?: Omit<ModelConfig, "parse">
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

// type ExtendSpaceFunction<OriginalDict, OriginalConfig> = <
//     NewDict,
//     NewConfig extends SpaceOptions<MergedDict>,
//     MergedDict = Merge<OriginalDict, NewDict>
// >(
//     definitions: Narrow<
//         Exact<
//             NewDict,
//             CheckCompileDict<NewDict, [], OriginalDict>
//         >
//     >,
//     config?: Narrow<NewConfig>
// ) => Space<MergedDict, ExtendSpaceConfig<OriginalConfig, NewConfig>>

export type SpaceDefinition = {
    dictionary: Record<string, any>
    config?: SpaceConfig<any>
}

export type Space<
    Dict,
    Config,
    SpaceParseConfig = KeyValuate<Config, "parse"> extends undefined
        ? {}
        : KeyValuate<Config, "parse">
> = Evaluate<{
    dictionary: Dict
    config: Config
    types: {
        [TypeName in keyof Dict]: Root.FastParse<
            Dict[TypeName],
            Dict,
            DefaultTypeOfContext
        >
    }
    models: DictionaryToModels<Dict, SpaceParseConfig>
    // @ts-ignore
    create: CreateFunction<{
        dictionary: Dict
        config: Config
    }>
    // extend: ExtendSpaceFunction<Dict, Config>
    // TODO: Add declare extension
}>

export type ValidateDictionary<Dict> = {
    [TypeName in keyof Dict]: Root.FastValidate<Dict[TypeName], Dict>
}

export type CompileFunction = <Dict, Config extends SpaceConfig<Dict>>(
    dictionary: ValidateDictionary<Dict>,
    config?: Config
) => Space<Dict, Config>

// // Exported compile function is equivalent to compile from an empty declare call
// // and will not validate missing or extraneous definitions
// export const compile = createCompileFunction()

const space = compile({
    a: {
        ok: "string"
    },
    b: {
        cool: "number|bigint"
    }
})
