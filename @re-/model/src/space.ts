import {
    chainableNoOpProxy,
    deepMerge,
    Evaluate,
    Merge,
    RequireKeys
} from "@re-/tools"
import { Model, ModelFrom, ModelFunction } from "./model.js"
import { Alias, Base, Root } from "./nodes/index.js"
import {
    checkForShallowCycle,
    ParseResolution,
    ValidateResolution
} from "./resolutions.js"

export const space: CreateSpaceFn = (dictionary, options) =>
    new Space(dictionary, options) as any

export class Space implements SpaceFrom<any> {
    inputs: SpaceFrom<any>["inputs"]
    models: Record<string, Model>
    config: SpaceConfig

    constructor(dictionary: SpaceDictionary, options?: SpaceOptions<string>) {
        this.inputs = { dictionary, options }
        this.config = configureSpace(dictionary, options)
        this.models = {}
        checkForShallowCycle(dictionary)
        for (const alias of Object.keys(this.config.resolutions)) {
            const ctx = Base.Parsing.createContext(
                deepMerge(this.config, this.config.models[alias]),
                this.config.resolutions
            )
            this.models[alias] = new Model(new Alias.Node(alias, ctx))
        }
    }

    create(def: unknown, options?: Base.ModelOptions) {
        const root = Root.parse(
            def,
            Base.Parsing.createContext(
                deepMerge(this.config, options),
                this.config.resolutions
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
    options?: SpaceOptions<AliasIn<Dict>>
) => SpaceFrom<ValidateDictionary<Dict>>

export type ValidateDictionary<Dict> = {
    [TypeName in keyof Dict]: ValidateResolution<TypeName, Dict>
}

export type SpaceOptions<ModelName extends string> = Base.ModelOptions & {
    models?: { [K in ModelName]?: Base.ModelOptions }
}

export type SpaceConfig = RequireKeys<SpaceOptions<any>, "models"> & {
    meta: MetaDefinitions
    resolutions: Base.Parsing.ResolutionMap
}

export type SpaceDictionary = Record<string, unknown>

export type SpaceFrom<Dict> = Evaluate<{
    models: DictionaryToModels<Dict>
    types: DictToTypes<Dict>
    create: ModelFunction<Dict>
    extend: ExtendFunction<Dict>
    inputs: {
        dictionary: Dict
        options: SpaceOptions<AliasIn<Dict>> | undefined
    }
}>

export type DictionaryToModels<Dict> = Evaluate<{
    [TypeName in AliasIn<Dict>]: ModelFrom<
        Dict[TypeName],
        ParseResolution<TypeName, Dict>
    >
}>

export type DictToTypes<Dict> = Evaluate<{
    [TypeName in AliasIn<Dict>]: ParseResolution<TypeName, Dict>
}>

export type MetaDefinitions = {
    onCycle?: unknown
    onResolve?: unknown
}

export type MetaKey = "__meta__"

export type AliasIn<Dict> = Extract<Exclude<keyof Dict, MetaKey>, string>

export type ExtendFunction<BaseDict> = <ExtensionDict>(
    dictionary: ValidateDictionaryExtension<BaseDict, ExtensionDict>,
    config?: SpaceExtensionOptions<AliasIn<BaseDict>, AliasIn<ExtensionDict>>
) => SpaceFrom<Merge<BaseDict, ExtensionDict>>

export type SpaceExtensionOptions<
    BaseModelName extends string,
    ExtensionModelName extends string
> = Base.ModelOptions & {
    models?: {
        [ModelName in BaseModelName | ExtensionModelName]?: Base.ModelOptions
    }
}

export type ValidateDictionaryExtension<BaseDict, ExtensionDict> = {
    [TypeName in keyof ExtensionDict]: Root.Validate<
        ExtensionDict[TypeName],
        Merge<BaseDict, ExtensionDict>
    >
}

const configureSpace = (
    dictionary: SpaceDictionary,
    options: SpaceOptions<string> = {}
): SpaceConfig => {
    const { __meta__ = {}, ...resolutions } = dictionary
    const { models = {}, ...config } = options
    return {
        ...config,
        meta: __meta__ as MetaDefinitions,
        resolutions,
        models
    }
}
