import { deepMerge, EntriesOf, Evaluate, Merge } from "@re-/tools"
import { Model, ModelFrom, ModelFunction } from "./model.js"
import { Common } from "./nodes/common.js"
import { Root } from "./nodes/index.js"
import { Alias } from "./nodes/str/alias.js"

export const compile: CompileFunction = (dictionary, options) =>
    new Space(dictionary, options) as any

export class Space implements SpaceFrom<any> {
    inputs: SpaceFrom<any>["inputs"]
    models: Record<string, Model>
    modelDefinitionEntries: EntriesOf<SpaceDictionary>
    config: SpaceConfig
    modelConfigs: Record<string, Common.ModelOptions>
    resolutions: Common.Parser.ResolutionMap

    constructor(dictionary: SpaceDictionary, options?: SpaceOptions<string>) {
        this.inputs = { dictionary, options }
        const normalized = normalizeSpaceInputs(dictionary, options)
        this.config = normalized.config
        this.modelConfigs = normalized.modelConfigs
        this.modelDefinitionEntries = normalized.modelDefinitionEntries
        this.resolutions = {}
        this.models = {}
        for (const [alias, resolution] of this.modelDefinitionEntries) {
            const ctx = Common.Parser.createContext(
                deepMerge(this.config, this.modelConfigs[alias]),
                this.resolutions
            )
            this.models[alias] = new Model(
                new Alias.Node(alias, ctx, resolution)
            )
        }
    }

    create(def: unknown, options?: Common.ModelOptions) {
        const root = Root.parse(
            def,
            Common.Parser.createContext(
                deepMerge(this.config, options),
                this.resolutions
            )
        )
        return new Model(root, deepMerge(this.config, options)) as any
    }

    extend(extensions: SpaceDictionary, overrides?: SpaceOptions<string>) {
        return new Space(
            { ...this.inputs.dictionary, ...extensions },
            deepMerge(this.inputs.options, overrides)
        ) as any
    }

    get types() {
        return Common.chainableNoOpProxy
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
    extends Common.ModelOptions {
    models?: { [K in ModelName]?: Common.ModelOptions }
}

type ModelNameIn<Dict> = keyof Dict & string

interface SpaceExtensionOptions<
    BaseModelName extends string,
    ExtensionModelName extends string
> extends Common.ModelOptions {
    models?: {
        [ModelName in BaseModelName | ExtensionModelName]?: Common.ModelOptions
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
    create: ModelFunction<Dict>
    extend: ExtendFunction<Dict>
    inputs: {
        dictionary: Dict
        options: SpaceOptions<ModelNameIn<Dict>> | undefined
    }
}

const normalizeSpaceInputs = (
    dictionary: any,
    options: SpaceOptions<string> = {}
) => {
    const { onCycle, onResolve, ...modelDefinitions } = dictionary
    const { models = {}, ...config } = options as SpaceConfig
    if (onCycle) {
        config.onCycle = onCycle
    }
    if (onResolve) {
        config.onResolve = onResolve
    }
    return {
        modelConfigs: models as Record<string, Common.ModelOptions>,
        modelDefinitionEntries: Object.entries(modelDefinitions),
        config
    }
}
