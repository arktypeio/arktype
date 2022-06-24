import {
    chainableNoOpProxy,
    deepMerge,
    Evaluate,
    Merge,
    RequireKeys
} from "@re-/tools"
import { Model, ModelFrom, ModelFunction } from "./model.js"
import { Common } from "./nodes/common.js"
import { Root } from "./nodes/index.js"
import { Alias } from "./nodes/str/alias.js"

export const space: CreateSpaceFn = (dictionary, options) =>
    new Space(dictionary, options) as any

const configureSpace = (
    dictionary: SpaceDictionary,
    options: SpaceOptions<string> = {}
): SpaceConfig => {
    const { __meta__ = {}, ...definitions } = dictionary
    const { models = {}, ...config } = options
    return {
        ...config,
        meta: __meta__ as MetaDefinitions,
        definitions,
        models
    }
}

export class Space implements SpaceFrom<any> {
    inputs: SpaceFrom<any>["inputs"]
    models: Record<string, Model>
    config: SpaceConfig
    resolutions: Common.Parser.ResolutionMap

    constructor(dictionary: SpaceDictionary, options?: SpaceOptions<string>) {
        this.inputs = { dictionary, options }
        this.config = configureSpace(dictionary, options)
        this.resolutions = {}
        this.models = {}
        for (const [alias, resolution] of Object.entries(
            this.config.definitions
        )) {
            const ctx = Common.Parser.createContext(
                deepMerge(this.config, this.config.models[alias]),
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
        return chainableNoOpProxy
    }
}

export type CreateSpaceFn = <Dict>(
    dictionary: ValidateDictionary<Dict>,
    options?: SpaceOptions<ModelNameIn<Dict>>
) => SpaceFrom<Dict>

export type ValidateDictionary<Dict> = {
    [TypeName in keyof Dict]: Root.Validate<Dict[TypeName], Dict>
}

export type SpaceOptions<ModelName extends string> = Common.ModelOptions & {
    models?: { [K in ModelName]?: Common.ModelOptions }
}

export type SpaceConfig = RequireKeys<SpaceOptions<any>, "models"> & {
    meta: MetaDefinitions
    definitions: SpaceDictionary
}

export type SpaceDictionary = Record<string, unknown>

export type SpaceFrom<Dict> = Evaluate<{
    models: DictionaryToModels<Dict>
    types: DictToTypes<Dict>
    create: ModelFunction<Dict>
    extend: ExtendFunction<Dict>
    inputs: {
        dictionary: Dict
        options: SpaceOptions<ModelNameIn<Dict>> | undefined
    }
}>

export type DictionaryToModels<Dict> = Evaluate<{
    [TypeName in Exclude<keyof Dict, MetaKey>]: ModelFrom<
        Dict[TypeName],
        Root.Parse<Dict[TypeName], Dict, {}>
    >
}>

export type DictToTypes<Dict> = Evaluate<{
    [TypeName in Exclude<keyof Dict, MetaKey>]: Root.Parse<
        Dict[TypeName],
        Dict,
        {}
    >
}>

export type MetaDefinitions = {
    onCycle?: unknown
    onResolve?: unknown
}

export type MetaKey = "__meta__"

export type ModelNameIn<Dict> = keyof Dict & string

export type ExtendFunction<BaseDict> = <ExtensionDict>(
    dictionary: ValidateDictionaryExtension<BaseDict, ExtensionDict>,
    config?: SpaceExtensionOptions<
        ModelNameIn<BaseDict>,
        ModelNameIn<ExtensionDict>
    >
) => SpaceFrom<Merge<BaseDict, ExtensionDict>>

export type SpaceExtensionOptions<
    BaseModelName extends string,
    ExtensionModelName extends string
> = Common.ModelOptions & {
    models?: {
        [ModelName in BaseModelName | ExtensionModelName]?: Common.ModelOptions
    }
}

export type ValidateDictionaryExtension<BaseDict, ExtensionDict> = {
    [TypeName in keyof ExtensionDict]: Root.Validate<
        ExtensionDict[TypeName],
        Merge<BaseDict, ExtensionDict>
    >
}
