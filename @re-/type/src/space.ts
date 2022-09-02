import {
    chainableNoOpProxy,
    Conform,
    deepMerge,
    Evaluate,
    Get,
    Merge,
    Narrow
} from "@re-/tools"
import { Node } from "./node/index.js"
import { ResolutionNode, ResolutionType } from "./resolution.js"
import { Root } from "./root.js"
import {
    DynamicType,
    Type,
    TypeFrom,
    TypeFunction,
    TypeOptions,
    Validate
} from "./type.js"

export const space: CreateSpaceFn = (dictionary, options) =>
    dynamicSpace(dictionary, options) as any

export type CreateSpaceFn = <Dict, Meta = {}>(
    dictionary: ValidateDictionary<Dict>,
    options?: ValidateSpaceOptions<Dict, Meta>
    // @ts-expect-error Constraining Meta interferes with our ability to validate it
) => SpaceOutput<{ Dict: ValidateDictionary<Dict>; Meta: Meta }>

export type DynamicSpace = Record<string, DynamicType> & {
    $root: SpaceMetaFrom<{ Dict: any; Meta: {} }>
}

// TODO: Update dict extension meta to not deepmerge, fix extension meta.
export const dynamicSpace = (
    dictionary: SpaceDictionary,
    options: SpaceOptions = {}
) => {
    const meta = new SpaceMeta(dictionary, options)
    const compiled: Record<string, any> = { $root: meta }
    for (const alias of Object.keys(dictionary)) {
        const resolution = new ResolutionNode(alias, meta)
        meta.resolutions[alias] = resolution
        compiled[alias] = new Type(resolution.root, resolution)
    }
    return compiled as DynamicSpace
}

export class SpaceMeta implements SpaceMetaFrom<any> {
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
        return dynamicSpace(
            { ...this.dictionary, ...extensions },
            deepMerge(this.options, overrides)
        ) as any
    }

    get infer() {
        return chainableNoOpProxy
    }

    get tree() {
        return Object.fromEntries(
            Object.entries(this.resolutions).map(([alias, resolution]) => [
                alias,
                resolution.tree
            ])
        )
    }
}

/**
 * Although this function claims to return Def, it actually returns an object
 * with a nested "$def" key containing the definition alongside any options
 * passed in an "$opts" key (or undefined if no options were passed).
 *
 * This allows users to provide alias-specific options without interfering
 * with type inference.
 */
export const def = <Def>(def: Narrow<Def>, options?: TypeOptions) =>
    ({
        $def: def,
        $opts: options
    } as any as Def)

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

export type Space = {
    Dict: unknown
    Meta: MetaDefinitions
}

export type ValidateDictionary<Dict> = Evaluate<{
    [Alias in keyof Dict]: ResolutionType.Validate<Alias, Dict>
}>

// TODO: Implement runtime equivalent for these
type ValidatedMetaDefs<Meta, Dict> = {
    onCycle?: Root.Validate<Get<Meta, "onCycle">, Dict & { $cyclic: "unknown" }>
    onResolve?: Root.Validate<
        Get<Meta, "onResolve">,
        Dict & { $resolution: "unknown" }
    >
}

export type ValidateSpaceOptions<Dict, Meta> = {
    parse?: Conform<Meta, ValidatedMetaDefs<Meta, Dict>>
} & TypeOptions

export type SpaceOptions = TypeOptions

export type SpaceDictionary = Record<string, unknown>

export type SpaceOutput<S extends Space> = Evaluate<
    SpaceTypes<S> & {
        $root: SpaceMetaFrom<S>
    }
>

export type SpaceMetaFrom<S extends Space> = {
    infer: InferSpaceRoot<S>
    tree: Root.Parse<S["Dict"], S["Dict"]>
    type: TypeFunction<S>
    extend: ExtendFunction<S>
    dictionary: S["Dict"]
    options: SpaceOptions
}

export type SpaceTypes<S extends Space> = Evaluate<{
    [Alias in keyof S["Dict"]]: TypeFrom<
        S["Dict"][Alias],
        S["Dict"],
        InferResolution<S, Alias>
    >
}>

export type InferSpaceRoot<S extends Space> = Evaluate<{
    [Alias in keyof S["Dict"]]: InferResolution<S, Alias>
}>

export type InferResolution<
    S extends Space,
    Alias extends keyof S["Dict"]
> = Root.Infer<
    S["Dict"][Alias],
    {
        Dict: S["Dict"]
        Meta: S["Meta"]
        Seen: { [K in Alias]: true }
    }
>

export type MetaDefinitions = {
    onCycle?: unknown
    onResolve?: unknown
}

export type ExtendFunction<S extends Space> = <ExtensionDict, ExtensionMeta>(
    dictionary: ValidateDictionaryExtension<S["Dict"], ExtensionDict>,
    options?: ValidateSpaceOptions<
        Merge<S["Dict"], ExtensionDict>,
        ExtensionMeta
    >
) => SpaceOutput<{
    Dict: Merge<S["Dict"], ExtensionDict>
    Meta: Merge<S["Meta"], ExtensionMeta>
}>

export type ValidateDictionaryExtension<BaseDict, ExtensionDict> = {
    [TypeName in keyof ExtensionDict]: Validate<
        ExtensionDict[TypeName],
        Merge<BaseDict, ExtensionDict>
    >
}
