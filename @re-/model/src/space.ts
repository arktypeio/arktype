import {
    chainableNoOpProxy,
    deepMerge,
    Evaluate,
    Merge,
    RequireKeys
} from "@re-/tools"
import { Model, ModelFrom, ModelFunction } from "./model.js"
import { Base, Root } from "./nodes/index.js"
import { Resolution } from "./nodes/resolution.js"

export const space: CreateSpaceFn = (dictionary, options) =>
    makeSpace(dictionary, options) as any

export const makeSpace = (
    dictionary: SpaceDictionary,
    options: SpaceOptions<string> = {}
) => {
    const meta = new SpaceMeta(dictionary, options)
    const compiled: Record<string, any> = { meta }
    for (const alias of Object.keys(dictionary)) {
        if (alias === "__meta__") {
            continue
        }
        const ctx = Base.Parsing.createContext(
            deepMerge(options, options?.models?.[alias]),
            meta
        )
        compiled[alias] = new Model(new Resolution.Node(alias, ctx))
    }
    return compiled
}

export class SpaceMeta implements SpaceMetaFrom<unknown> {
    resolutions: Record<string, Resolution.Node>

    constructor(
        public dictionary: SpaceDictionary,
        public options: SpaceOptions<string> = {}
    ) {
        this.resolutions = {}
    }

    model(def: unknown, options?: Base.ModelOptions) {
        const root = Root.parse(
            def,
            Base.Parsing.createContext(deepMerge(this.options, options), this)
        )
        return new Model(root, deepMerge(this.options, options)) as any
    }

    extend(extensions: SpaceDictionary, overrides?: SpaceOptions<string>) {
        return makeSpace(
            { ...this.dictionary, ...extensions },
            deepMerge(this.options, overrides)
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
    [Alias in keyof Dict]: Resolution.Validate<Alias, Dict>
}

export type SpaceLevelOptions = Base.ModelOptions

export type SpaceOptions<ModelName extends string> = SpaceLevelOptions & {
    models?: { [K in ModelName]?: Base.ModelOptions }
}

export type SpaceConfig = RequireKeys<SpaceOptions<any>, "models">

export type SpaceDictionary = Record<string, unknown>

export type SpaceFrom<Dict> = Evaluate<
    DictionaryToModels<Dict> & {
        meta: SpaceMetaFrom<Dict>
    }
>

export type SpaceMetaFrom<Dict> = {
    types: DictToTypes<Dict>
    model: ModelFunction<Dict>
    extend: ExtendFunction<Dict>
    dictionary: Dict
    options: SpaceOptions<AliasIn<Dict>> | undefined
}

export type DictionaryToModels<Dict> = Evaluate<{
    [Alias in AliasIn<Dict>]: ModelFrom<
        Dict[Alias],
        Resolution.Parse<Alias, Dict>
    >
}>

export type DictToTypes<Dict> = Evaluate<{
    [Alias in AliasIn<Dict>]: Resolution.Parse<Alias, Dict>
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
> = SpaceLevelOptions & {
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
