import { diffSets, Evaluate, Merge, transform } from "@re-/tools"
import { typeDefProxy } from "./internal.js"
import {
    BaseOptions,
    createCreateFunction,
    CreateFunction,
    Model,
    ModelOptions
} from "./model.js"
import { Root } from "./nodes/index.js"

export type MetaKey = "onCycle" | "onResolve"

export type DictionaryToModels<Dict> = Evaluate<{
    [TypeName in Exclude<keyof Dict, MetaKey>]: Model<
        Dict[TypeName],
        Root.Parse<Dict[TypeName], Dict, { [K in TypeName]: true }>
    >
}>

interface InternalSpaceOptions extends SpaceOptions<string> {
    declaredTypeNames?: string[]
}

// @ts-ignore
export const compile: CompileFunction = (
    dictionary,
    config: InternalSpaceOptions = {}
) => {
    if (config.declaredTypeNames) {
        const declarationErrors = diffSets(
            config.declaredTypeNames,
            Object.keys(dictionary)
        )
        if (declarationErrors) {
            const errorParts = [] as string[]
            if (declarationErrors.added) {
                errorParts.push(
                    `Defined types ${declarationErrors.added
                        .map((_) => `'${_}'`)
                        .join(", ")} were never declared.`
                )
            }
            if (declarationErrors.removed) {
                errorParts.push(
                    `Declared types ${declarationErrors.removed
                        .map((_) => `'${_}'`)
                        .join(", ")} were never defined.`
                )
            }
            throw new Error(errorParts.join(" "))
        }
    }
    const create = createCreateFunction({ dictionary, config })
    const extend: ExtendFunction<unknown> = (newDefinitions, newConfig) =>
        compile(
            // @ts-ignore
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
    }
}

export interface SpaceOptions<ModelName extends string> extends BaseOptions {
    models?: { [K in ModelName]?: ModelOptions }
}

export interface SpaceConfig<ModelName extends string>
    extends SpaceOptions<ModelName> {
    onCycle?: unknown
    onResolve?: unknown
}

export type SpaceDefinition = {
    dictionary: Record<string, unknown>
    config?: SpaceOptions<string>
}

export type ConfiguredSpace = {
    dictionary: Record<string, unknown>
    config: SpaceConfig<string>
}

export type ExtendFunction<BaseDict> = <Dict>(
    dictionary: ValidateDictionary<Dict>,
    config?: SpaceOptions<(keyof Dict | keyof BaseDict) & string>
) => Space<Merge<BaseDict, Dict>>

export type DictToTypes<Dict> = Evaluate<{
    [TypeName in Exclude<keyof Dict, MetaKey>]: Root.Parse<
        Dict[TypeName],
        Dict,
        { [K in TypeName]: true }
    >
}>

export type Space<Dict> = {
    models: DictionaryToModels<Dict>
    config: SpaceConfig<keyof Dict & string>
    types: DictToTypes<Dict>
    dictionary: Dict
    create: CreateFunction<Dict>
    extend: ExtendFunction<Dict>
}

export type ValidateDictionary<Dict> = {
    [TypeName in keyof Dict]: Root.Validate<Dict[TypeName], Dict>
}

export type CompileFunction = <Dict>(
    dictionary: ValidateDictionary<Dict>,
    config?: SpaceOptions<keyof Dict & string>
) => Space<Dict>
