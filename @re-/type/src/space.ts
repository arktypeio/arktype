import {
    chainableNoOpProxy,
    Conform,
    deepMerge,
    Evaluate,
    Get,
    Merge
} from "@re-/tools"
import { Node } from "./common.js"
import { ResolutionNode, ResolutionType } from "./resolution.js"
import { Root } from "./root.js"
import { Type, TypeFrom, TypeFunction, TypeOptions, Validate } from "./type.js"

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
        const resolution = new ResolutionNode(alias, meta)
        meta.resolutions[alias] = resolution
        compiled[alias] = new Type(resolution.def, resolution)
    }
    return compiled as RawSpace
}

export class SpaceMeta implements SpaceMetaFrom<unknown, unknown> {
    resolutions: Record<string, ResolutionNode>

    constructor(
        public dictionary: SpaceDictionary,
        public options: SpaceOptions = {}
    ) {
        this.resolutions = {}
    }

    type(def: unknown, options: TypeOptions = {}) {
        const root = Root.parse(
            def,
            Node.initializeContext(deepMerge(this.options, options), this)
        )
        return new Type(def, root, deepMerge(this.options, options)) as any
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
 * passed in an "$opts" key (or undefined if no options were passed).
 *
 * This allows users to provide alias-specific options without interfering
 * with type inference.
 */
export const def = <Def>(def: Def, options?: TypeOptions) =>
    ({
        $def: def,
        $opts: options
    } as Def)

export type DefWithOptions = {
    def: unknown
    options: TypeOptions | undefined
}

export const getResolutionDefAndOptions = (def: any): DefWithOptions => {
    if (def.$def !== undefined) {
        return {
            def: def.$def,
            options: def.$opts
        }
    }
    return {
        def,
        options: undefined
    }
}

export type ValidateDictionary<Dict> = {
    [Alias in keyof Dict]: ResolutionType.Validate<Alias, Dict>
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
} & TypeOptions

export type SpaceOptions = TypeOptions

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
        ResolutionType.Infer<Alias, Dict, Meta>
    >
}>

export type RootDictType<Dict, Meta> = Evaluate<{
    [Alias in keyof Dict]: ResolutionType.Infer<Alias, Dict, Meta>
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
