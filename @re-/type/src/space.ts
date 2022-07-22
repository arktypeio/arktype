import {
    chainableNoOpProxy,
    Conform,
    deepMerge,
    Evaluate,
    Get,
    Merge,
    RequireKeys
} from "@re-/tools"
import { Base, Root } from "./nodes/index.js"
import { Resolution } from "./nodes/resolution.js"
import { Type, TypeFrom, TypeFunction, Validate } from "./type.js"

export const space: CreateSpaceFn = (dictionary, options) =>
    spaceRaw(dictionary, options) as any

export const spaceRaw = (
    dictionary: SpaceDictionary,
    options: SpaceOptions<string> = {}
) => {
    const meta = new SpaceMeta(dictionary, options)
    const compiled: Record<string, any> = { $meta: meta }
    for (const alias of Object.keys(dictionary)) {
        if (alias === "$meta") {
            continue
        }
        const ctx = Base.Parsing.createContext(
            deepMerge(options, options?.models?.[alias]),
            meta
        )
        compiled[alias] = new Type(new Resolution.Node(alias, ctx))
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

    type(def: unknown, options?: Base.TypeOptions) {
        const root = Root.parse(
            def,
            Base.Parsing.createContext(deepMerge(this.options, options), this)
        )
        return new Type(root, deepMerge(this.options, options)) as any
    }

    extend(extensions: SpaceDictionary, overrides?: SpaceOptions<string>) {
        return spaceRaw(
            { ...this.dictionary, ...extensions },
            deepMerge(this.options, overrides)
        ) as any
    }

    get infer() {
        return chainableNoOpProxy
    }
}

export type CreateSpaceFn = <Dict>(
    dictionary: ValidateDictionary<Dict>,
    options?: SpaceOptions<AliasIn<Dict>>
) => SpaceFrom<ValidateDictionary<Dict>>

export const define = <Def>(def: Def, options?: Base.TypeOptions) =>
    ({
        $def: def,
        options
    } as Def)

export type ValidateDictionary<Dict> = {
    [Alias in keyof Dict]: Alias extends "$meta"
        ? ValidateDictionaryMeta<Dict[Alias], Dict>
        : Resolution.Validate<Alias, Dict>
}

type ValidateDictionaryMeta<Meta, Dict> = Conform<
    Meta,
    {
        onCycle?: Root.Validate<
            Get<Meta, "onCycle">,
            Dict & { $cyclic: "unknown" }
        >
        onResolve?: Root.Validate<
            Get<Meta, "onResolve">,
            Dict & { $resolution: "unknown" }
        >
    }
>

export type SpaceLevelOptions = Base.TypeOptions

export type SpaceOptions<TypeName extends string> = SpaceLevelOptions & {
    models?: { [K in TypeName]?: Base.TypeOptions }
}

export type SpaceConfig = RequireKeys<SpaceOptions<any>, "models">

export type SpaceDictionary = Record<string, unknown>

export type SpaceFrom<Dict> = Evaluate<
    DictionaryToTypes<Dict> & {
        $meta: SpaceMetaFrom<Dict>
    }
>

export type SpaceMetaFrom<Dict> = {
    infer: DictToTypes<Dict>
    type: TypeFunction<Dict>
    extend: ExtendFunction<Dict>
    dictionary: Dict
    options: SpaceOptions<AliasIn<Dict>> | undefined
}

export type DictionaryToTypes<Dict> = Evaluate<{
    [Alias in AliasIn<Dict>]: TypeFrom<
        Dict[Alias],
        Dict,
        Resolution.TypeOf<Alias, Dict>
    >
}>

export type DictToTypes<Dict> = Evaluate<{
    [Alias in AliasIn<Dict>]: Resolution.TypeOf<Alias, Dict>
}>

export type MetaDefinitions = {
    onCycle?: unknown
    onResolve?: unknown
}

export type AliasIn<Dict> = Extract<Exclude<keyof Dict, "$meta">, string>

export type ExtendFunction<BaseDict> = <ExtensionDict>(
    dictionary: ValidateDictionaryExtension<BaseDict, ExtensionDict>,
    options?: SpaceExtensionOptions<AliasIn<BaseDict>, AliasIn<ExtensionDict>>
) => SpaceFrom<Merge<BaseDict, ExtensionDict>>

export type SpaceExtensionOptions<
    BaseTypeName extends string,
    ExtensionTypeName extends string
> = SpaceLevelOptions & {
    models?: {
        [TypeName in BaseTypeName | ExtensionTypeName]?: Base.TypeOptions
    }
}

export type ValidateDictionaryExtension<BaseDict, ExtensionDict> = {
    [TypeName in keyof ExtensionDict]: Validate<
        ExtensionDict[TypeName],
        Merge<BaseDict, ExtensionDict>
    >
}
