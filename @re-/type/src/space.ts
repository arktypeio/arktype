import {
    chainableNoOpProxy,
    Conform,
    deepMerge,
    Evaluate,
    Get,
    Merge
} from "@re-/tools"
import { Base, Root } from "./nodes/index.js"
import { Resolution } from "./nodes/resolution.js"
import { Type, TypeFrom, TypeFunction, Validate } from "./type.js"

export const space: CreateSpaceFn = (dictionary, options) =>
    rawSpace(dictionary, options) as any

export type RawSpace = Record<string, any> & { $meta: SpaceMeta }

export const rawSpace = (
    dictionary: SpaceDictionary,
    options: SpaceOptions = {}
) => {
    const meta = new SpaceMeta(dictionary, options)
    const compiled: Record<string, any> = { $meta: meta }
    for (const alias of Object.keys(dictionary)) {
        if (alias === "$meta") {
            continue
        }
        compiled[alias] = new Type(new Resolution.Node(alias, meta, []))
    }
    return compiled as RawSpace
}

export class SpaceMeta implements SpaceMetaFrom<unknown> {
    resolutions: Record<string, Resolution.Node>

    constructor(
        public dictionary: SpaceDictionary,
        public options: SpaceOptions = {}
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

    extend(extensions: SpaceDictionary, overrides?: SpaceOptions) {
        return rawSpace(
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
    options?: SpaceOptions
) => SpaceFrom<ValidateDictionary<Dict>>

/**
 * Although this function claims to return Def, it actually returns an object
 * with a nested "$def" key containing the definition alongside any options
 * passed in an "options" key (or undefined if no options were passed).
 *
 * This allows users to provide alias-specific options without interfering
 * with type inference.
 */
export const def = <Def>(def: Def, options: Base.TypeOptions) =>
    ({
        $def: def,
        options
    } as Def)

export type DefWithOptions = {
    def: unknown
    options: Base.TypeOptions | undefined
}

export const getResolutionDefAndOptions = (def: any): DefWithOptions => {
    if (def?.$def !== undefined) {
        return {
            def: def.$def,
            options: def.options
        }
    }
    return {
        def,
        options: undefined
    }
}

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

export type SpaceOptions = Base.TypeOptions

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
    options: SpaceOptions
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
    options?: SpaceOptions
) => SpaceFrom<Merge<BaseDict, ExtensionDict>>

export type ValidateDictionaryExtension<BaseDict, ExtensionDict> = {
    [TypeName in keyof ExtensionDict]: Validate<
        ExtensionDict[TypeName],
        Merge<BaseDict, ExtensionDict>
    >
}
