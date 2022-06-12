import { deepMerge, EntriesOf, Entry, Evaluate, Merge } from "@re-/tools"
import { Model, ModelFrom, ModelFunction } from "./model.js"
import { Root } from "./nodes/index.js"
import { Common } from "#common"

export const compile: CompileFunction = (dictionary, options) =>
    new Space(dictionary, options) as any

export class Space implements SpaceFrom<any> {
    inputs: SpaceFrom<any>["inputs"]
    models: Record<string, Model>
    modelDefinitionEntries: EntriesOf<SpaceDictionary>
    config: SpaceConfig

    constructor(dictionary: SpaceDictionary, options?: SpaceOptions<string>) {
        this.inputs = { dictionary, options }
        const normalized = normalizeSpaceInputs(dictionary, options)
        this.modelDefinitionEntries = normalized.modelDefinitionEntries
        this.config = normalized.config
        this.models = {}
        for (const [typeName, definition] of this.modelDefinitionEntries) {
            this.models[typeName] = new Model(
                definition,
                deepMerge(this.config, this.config?.models?.[typeName]),
                this
            )
        }
    }

    create(def: any, options?: Common.BaseOptions) {
        return new Model(def, deepMerge(this.config, options), this) as any
    }

    extend(extensions: SpaceDictionary, overrides?: SpaceOptions<string>) {
        return new Space(
            { ...this.inputs.dictionary, ...extensions },
            deepMerge(this.inputs.options, overrides)
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

export interface SpaceOptions<ModelName extends string>
    extends Common.BaseOptions {
    models?: { [K in ModelName]?: Common.BaseOptions }
}

type ModelNameIn<Dict> = keyof Dict & string

interface SpaceExtensionOptions<
    BaseModelName extends string,
    ExtensionModelName extends string
> extends Common.BaseOptions {
    models?: {
        [ModelName in BaseModelName | ExtensionModelName]?: Common.BaseOptions
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

const normalizeSpaceInputs = (
    dictionary: any,
    options?: SpaceOptions<string>
) => {
    const { onCycle, onResolve, ...modelDefinitions } = dictionary
    const config: SpaceConfig = { ...options }
    if (onCycle) {
        config.onCycle = onCycle
    }
    if (onResolve) {
        config.onResolve = onResolve
    }
    return {
        modelDefinitionEntries: Object.entries(modelDefinitions),
        config
    }
}
