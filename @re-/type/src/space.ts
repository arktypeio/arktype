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

export type RawSpace = Record<string, any> & { $root: SpaceMeta }

// TODO: Update dict extension meta to not deepmerge, fix extension meta.
export const rawSpace = (
    dictionary: SpaceDictionary,
    options: SpaceOptions = {}
) => {
    const meta = new SpaceMeta(dictionary, options)
    const compiled: Record<string, any> = { $root: meta }
    for (const alias of Object.keys(dictionary)) {
        if (alias === "$root") {
            continue
        }
        compiled[alias] = new Type(new Resolution.Node(alias, meta, []))
    }
    return compiled as RawSpace
}

export class SpaceMeta implements SpaceMetaFrom<unknown, unknown> {
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

export type CreateSpaceFn = <Dict, Meta>(
    dictionary: ValidateDictionary<Dict>,
    options?: ValidateSpaceOptions<Dict, Meta>
) => SpaceFrom<ValidateDictionary<Dict>, Meta>

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
    [Alias in keyof Dict]: Resolution.Validate<Alias, Dict>
}

// TODO: Implement runtime equivalent for these
type MetaDefs<Dict, Meta> = {
    onCycle?: Root.Validate<Get<Meta, "onCycle">, Dict & { $cyclic: "any" }>
    onResolve?: Root.Validate<
        Get<Meta, "onResolve">,
        Dict & { $resolution: "any" }
    >
}

type ValidateSpaceOptions<Dict, Meta> = {
    parse?: Conform<Meta, MetaDefs<Dict, Meta>>
} & Base.TypeOptions

export type SpaceOptions = Base.TypeOptions

export type SpaceDictionary = Record<string, unknown>

export type SpaceFrom<Dict, Meta> = Evaluate<
    DictionaryToTypes<Dict, Meta> & {
        $root: SpaceMetaFrom<Dict, Meta>
    }
>

export type SpaceMetaFrom<Dict, Meta> = {
    infer: RootDictType<Dict, Meta>
    type: TypeFunction<Dict, Meta>
    extend: ExtendFunction<Dict>
    dictionary: Dict
    options: SpaceOptions
}

export type DictionaryToTypes<Dict, Meta> = Evaluate<{
    [Alias in keyof Dict]: TypeFrom<
        Dict[Alias],
        Dict,
        Resolution.TypeOf<Alias, Dict, Meta>
    >
}>

export type RootDictType<Dict, Meta> = Evaluate<{
    [Alias in keyof Dict]: Resolution.TypeOf<Alias, Dict, Meta>
}>

export type MetaDefinitions = {
    onCycle?: unknown
    onResolve?: unknown
}

export type ExtendFunction<BaseDict> = <ExtensionDict>(
    dictionary: ValidateDictionaryExtension<BaseDict, ExtensionDict>,
    options?: SpaceOptions
) => SpaceFrom<Merge<BaseDict, ExtensionDict>, {}>

export type ValidateDictionaryExtension<BaseDict, ExtensionDict> = {
    [TypeName in keyof ExtensionDict]: Validate<
        ExtensionDict[TypeName],
        Merge<BaseDict, ExtensionDict>
    >
}
