import { Entry, Evaluate, Merge } from "@re-/tools"
import { BaseOptions, Model, ModelFrom, ModelFunction } from "./model.js"
import { Root } from "./nodes/index.js"
import { Common } from "#common"

export class Space implements SpaceFrom<any> {
    inputs: SpaceFrom<any>["inputs"]
    models: DictionaryToModels<any>

    modelDefinitions: SpaceDictionary
    config: SpaceConfig

    constructor(dictionary: SpaceDictionary, options?: SpaceOptions<string>) {
        this.inputs = { dictionary, options }
        const normalized = normalizeSpaceInputs(dictionary, options)
        this.modelDefinitions = normalized.modelDefinitions
        this.config = normalized.config
        this.models = {} as any
        for (const [typeName, definition] of Object.entries(
            this.modelDefinitions
        ) as Entry<string, any>[]) {
            this.models[typeName] = new Model(definition, {
                ...this.config,
                ...this.config?.models?.[typeName]
            })
        }
    }

    create(def: any, options?: BaseOptions) {
        return new Model(def, options, this) as any
    }

    extend(extensions: SpaceDictionary, overrides?: SpaceOptions<string>) {
        return new Space(
            { ...this.inputs.dictionary, ...extensions },
            {
                ...this.inputs.options,
                ...overrides
            }
        ) as any
    }

    get types() {
        return Common.typeDefProxy
    }
}

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

type ModelNameIn<Dict> = keyof Dict & string

interface SpaceExtensionOptions<
    BaseModelName extends string,
    ExtensionModelName extends string
> extends BaseOptions {
    models?: {
        [ModelName in BaseModelName | ExtensionModelName]?: BaseOptions
    }
}

interface SpaceConfig extends SpaceOptions<any> {
    onCycle?: unknown
    onResolve?: unknown
}

type SpaceDictionary = Record<string, unknown>

type ValidateDictionaryExtension<BaseDict, ExtensionDict> = {
    [TypeName in keyof ExtensionDict]: Root.Validate<
        ExtensionDict[TypeName],
        Merge<BaseDict, ExtensionDict>
    >
}

export type ExtendFunction<BaseDict> = <ExtensionDict>(
    dictionary: ValidateDictionaryExtension<BaseDict, ExtensionDict>,
    config?: SpaceExtensionOptions<
        ModelNameIn<BaseDict>,
        ModelNameIn<ExtensionDict>
    >
) => SpaceFrom<Merge<BaseDict, ExtensionDict>>

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
    options?: SpaceOptions<ModelNameIn<Dict>>
) => SpaceFrom<Dict>

export type SpaceFrom<Dict> = {
    models: DictionaryToModels<Dict>
    types: DictToTypes<Dict>
    extend: ExtendFunction<Dict>
    create: ModelFunction<Dict>
    inputs: {
        dictionary: Dict
        options: SpaceOptions<ModelNameIn<Dict>> | undefined
    }
}

export const compile: CompileFunction = (dictionary, options) =>
    new Space(dictionary, options) as any

const normalizeSpaceInputs = (
    dictionary: any,
    options?: SpaceOptions<string>
) => {
    const { onCycle, onResolve, ...modelDefinitions } = dictionary
    const config: SpaceConfig = options ?? {}
    if (onCycle) {
        config.onCycle = onCycle
    }
    if (onResolve) {
        config.onResolve = onResolve
    }
    return {
        modelDefinitions,
        config
    }
}
