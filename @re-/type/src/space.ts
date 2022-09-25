import type { Conform, Evaluate, Get, Merge, Narrow } from "@re-/tools"
import { chainableNoOpProxy, deepMerge, mapValues } from "@re-/tools"
import type { RootNode } from "./nodes/common.js"
import { ResolutionNode } from "./nodes/resolution.js"
import type { ParseOptions } from "./parser/common.js"
import { initializeParseContext } from "./parser/common.js"
import type { ResolutionType } from "./parser/resolution.js"
import { Root } from "./parser/root.js"
import type {
    DynamicType,
    TypeFn,
    TypeFrom,
    TypeOptions,
    Validate
} from "./type.js"
import { Type } from "./type.js"

export const space: CreateSpaceFn = (dictionary, options) =>
    dynamicSpace(dictionary, options) as any

export type CreateSpaceFn = <Dict, Meta = {}>(
    dictionary: ValidateResolutions<Dict>,
    options?: ValidateSpaceOptions<Dict, Meta>
    // @ts-expect-error Constraining Meta interferes with our ability to validate it
) => SpaceOutput<{ Dict: ValidateResolutions<Dict>; Meta: Meta }>

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
        compiled[alias] = new Type(resolution.root, resolution, options)
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

    type(definition: unknown, options: TypeOptions<any> = {}) {
        const compiledOptions = deepMerge(this.options, options)
        const root = Root.parse(
            definition,
            initializeParseContext(compiledOptions, this)
        )
        return new Type(definition, root, compiledOptions) as any
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

    get ast() {
        return mapValues(this.resolutions, (resolution) => resolution.ast)
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
export const define = <Def>(definition: Narrow<Def>, options?: TypeOptions) =>
    ({
        $def: definition,
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
    Meta: ParseOptions
}

export type ValidateResolutions<Dict> = Evaluate<{
    [Alias in keyof Dict]: ResolutionType.Validate<Alias, Dict>
}>

// TODO: Implement runtime equivalent for these
type ValidateMetaDefs<Meta, Dict> = {
    onCycle?: Root.Validate<Get<Meta, "onCycle">, Dict & { $cyclic: "unknown" }>
    onResolve?: Root.Validate<
        Get<Meta, "onResolve">,
        Dict & { $resolution: "unknown" }
    >
}

export type ValidateSpaceOptions<Dict, Meta> = {
    parse?: Conform<Meta, ValidateMetaDefs<Meta, Dict>>
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
    ast: Root.Parse<S["Dict"], S["Dict"]>
    type: TypeFn<S>
    extend: ExtendFn<S>
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
> = RootNode.Infer<
    S["Dict"][Alias],
    {
        Dict: S["Dict"]
        Meta: S["Meta"]
        Seen: { [K in Alias]: true }
    }
>

export type ExtendFn<S extends Space> = <ExtensionDict, ExtensionMeta>(
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
