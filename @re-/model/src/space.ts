import { Evaluate, Merge } from "@re-/tools"
import { BaseOptions, Model, ModelFrom, ModelFunction } from "./model.js"
import { Root } from "./nodes/index.js"
import { Common } from "#common"

export type MetaKey = "onCycle" | "onResolve"

export type DictionaryToModels<Dict> = Evaluate<{
    [TypeName in Exclude<keyof Dict, MetaKey>]: ModelFrom<
        Dict[TypeName],
        Root.Parse<Dict[TypeName], Dict, { [K in TypeName]: true }>
    >
}>

export interface SpaceOptions<ModelName extends string> extends BaseOptions {
    models?: { [K in ModelName]?: BaseOptions }
}

export interface SpaceConfig<ModelName extends string>
    extends SpaceOptions<ModelName> {
    onCycle?: unknown
    onResolve?: unknown
}

export type SpaceDictionary = Record<string, unknown>

export type SpaceDefinition<Dict> = {
    dictionary: Dict
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

export type ValidateDictionary<Dict> = {
    [TypeName in keyof Dict]: Root.Validate<Dict[TypeName], Dict>
}

export type CompileFunction = <Dict>(
    dictionary: ValidateDictionary<Dict>,
    options?: SpaceOptions<keyof Dict & string>
) => SpaceFrom<Dict>

export type SpaceFrom<Dict> = {
    dictionary: Dict
    models: DictionaryToModels<Dict>
    types: DictToTypes<Dict>
    extend: ExtendFunction<Dict>
    create: ModelFunction<Dict>
}

export const compile: CompileFunction = (dictionary, options) =>
    new Space(dictionary, options) as any

export class Space<Dict> implements SpaceFrom<Dict> {
    readonly dictionary: Dict
    readonly config: SpaceOptions<keyof Dict & string>
    readonly models: DictionaryToModels<Dict>
    create: ModelFunction<Dict>
    extend: ExtendFunction<Dict>

    constructor(
        dictionary: ValidateDictionary<Dict>,
        options?: SpaceOptions<keyof Dict & string>
    ) {
        const { onCycle, onResolve, ...definitions } = dictionary as any
        const config: SpaceConfig<string> = options ?? {}
        if (onCycle) {
            config.onCycle = onCycle
        }
        if (onResolve) {
            config.onResolve = onResolve
        }
        this.dictionary = definitions
        this.config = config as any
        const models: any = {}
        for (const [typeName, definition] of Object.entries(this.dictionary)) {
            models[typeName] = new Model(definition, {
                ...config,
                ...config?.models?.[typeName]
            })
        }
        this.models = models
        this.create = (def, options) => new Model(def, options, this as any)
        this.extend = (dict, options) => this as any
    }

    get types(): DictToTypes<Dict> {
        return Common.typeDefProxy
    }
}
