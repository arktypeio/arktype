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
        return rawSpace(
            { ...this.dictionary, ...extensions },
            deepMerge(this.options, overrides)
        ) as any
    }

    get infer() {
        return chainableNoOpProxy
    }
}

export type CreateSpaceFn = <Dict, Meta = {}>(
    dictionary: ValidateDictionary<Dict>,
    options?: ValidateSpaceOptions<Dict, Meta>
) => SpaceOutput<ToSpace<ValidateDictionary<Dict>, Meta>>

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
    Resolutions: unknown
    Meta: MetaDefinitions
}

export type ValidateDictionary<Dict> = {
    [Alias in keyof Dict]: ResolutionType.Validate<Alias, Dict>
}

// TODO: Implement runtime equivalent for these
type ValidatedMetaDefs<Meta, Dict> = {
    onCycle?: Root.Validate<Get<Meta, "onCycle">, Dict & { $cyclic: "any" }>
    onResolve?: Root.Validate<
        Get<Meta, "onResolve">,
        Dict & { $resolution: "any" }
    >
}

type ParseMetaDefs<Meta, Dict> = {
    [K in keyof Meta]: K extends "onCycle"
        ? Root.Parse<Meta[K], Dict & { $cyclic: "any" }>
        : K extends "onResolve"
        ? Root.Parse<Meta[K], Dict & { $resolution: "any" }>
        : Node.ParseError<`Unexpected meta key '${K & string}'.`>
}

type ValidateSpaceOptions<Dict, Meta> = {
    parse?: Conform<Meta, ValidatedMetaDefs<Meta, Dict>>
} & TypeOptions

export type SpaceOptions = TypeOptions

export type SpaceDictionary = Record<string, unknown>

export type Parse<Dict> = {
    [Alias in keyof Dict]: Root.Parse<Dict[Alias], Dict>
}

export type ToSpace<Dict, Meta> = {
    Resolutions: Parse<Dict>
    Meta: ParseMetaDefs<Meta, Dict>
}

export type SpaceOutput<S extends Space> = Evaluate<
    SpaceTypes<S> & {
        $root: SpaceMetaFrom<S>
    }
>

export type SpaceMetaFrom<S extends Space> = {
    infer: InferSpaceRoot<S>
    type: TypeFunction<S>
    extend: ExtendFunction<S["Resolutions"]>
    dictionary: S["Resolutions"]
    options: SpaceOptions
}

export type SpaceTypes<S extends Space> = Evaluate<{
    [Alias in keyof S["Resolutions"]]: TypeFrom<
        Alias,
        S["Resolutions"][Alias],
        InferResolution<S, Alias>
    >
}>

export type InferSpaceRoot<S extends Space> = Evaluate<{
    [Alias in keyof S["Resolutions"]]: InferResolution<S, Alias>
}>

export type InferResolution<
    S extends Space,
    Alias extends keyof S["Resolutions"]
> = Root.Infer<
    S["Resolutions"][Alias],
    { Space: S; Seen: { [K in Alias]: true } }
>

export type MetaDefinitions = {
    onCycle?: unknown
    onResolve?: unknown
}

export type ExtendFunction<BaseDict> = <ExtensionDict>(
    dictionary: ValidateDictionaryExtension<BaseDict, ExtensionDict>,
    options?: SpaceOptions
) => SpaceOutput<{
    Resolutions: Parse<Merge<BaseDict, ExtensionDict>>
    // TODO: Fix
    Meta: {}
}>

export type ValidateDictionaryExtension<BaseDict, ExtensionDict> = {
    [TypeName in keyof ExtensionDict]: Validate<
        ExtensionDict[TypeName],
        Merge<BaseDict, ExtensionDict>
    >
}
