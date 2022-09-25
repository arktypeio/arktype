import type {
    Conform,
    Dictionary,
    Evaluate,
    Get,
    Merge,
    Narrow
} from "@re-/tools"
import { chainableNoOpProxy, deepMerge, mapValues } from "@re-/tools"
import type { RootNode } from "./nodes/common.js"
import { ResolutionNode } from "./nodes/resolution.js"
import type { ParseOptions } from "./parser/common.js"
import { initializeParseContext } from "./parser/common.js"
import type { ResolutionType } from "./parser/resolution.js"
import { Root } from "./parser/root.js"
import type { DynamicType, ToType, TypeFn, TypeOptions } from "./type.js"
import { Type } from "./type.js"

// TODO: Ensure there are no extraneous types/space calls from testing
export const space: SpaceFn = (dictionary, options) =>
    dynamicSpace(dictionary, options) as any

export const types = space(
    { a: "string[]", b: "a" },
    { parse: { onResolve: "0" } }
).$root

export type SpaceFn = <Definitions, Meta = {}>(
    dictionary: ValidateResolutions<Definitions, Meta>,
    options?: ValidateSpaceOptions<Definitions, Meta>
) => ToSpaceOutput<Definitions & { $root: Meta }>

export type DynamicSpace = Record<string, DynamicType> & {
    $root: SpaceRootFrom<any, any>
}

// TODO: Update dict extension meta to not deepmerge, fix extension meta.
export const dynamicSpace = (
    dictionary: Dictionary,
    options: SpaceOptions = {}
) => {
    const root = new SpaceRoot(dictionary, options)
    const compiled: Record<string, any> = { $root: root }
    for (const alias of Object.keys(dictionary)) {
        const resolution = new ResolutionNode(alias, root)
        root.resolutions[alias] = resolution
        compiled[alias] = new Type(resolution.root, resolution, options)
    }
    return compiled as DynamicSpace
}

// TODO: Ensure "Dict"/"dictionary" etc. is not used anywhere referencing space
export class SpaceRoot implements SpaceRootFrom<any, any> {
    resolutions: Record<string, ResolutionNode>

    constructor(
        public definitions: Dictionary,
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

    extend(extensions: Dictionary, overrides?: SpaceOptions) {
        return dynamicSpace(
            { ...this.definitions, ...extensions },
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

export type ValidateResolutions<Definitions, Meta> = Evaluate<{
    [Alias in keyof Definitions]: ResolutionType.Validate<
        Alias,
        Definitions & { $root: Meta }
    >
}>

// TODO: Implement runtime equivalent for these
type ValidateMetaDefs<Meta, Definitions> = {
    onResolve?: Root.Validate<
        Get<Meta, "onResolve">,
        Definitions & { $resolution: "unknown" }
    >
}

export type ValidateSpaceOptions<Dict, Meta> = {
    parse?: Conform<Meta, ValidateMetaDefs<Meta, Dict>>
} & TypeOptions

export type SpaceOptions = TypeOptions & { parse?: ParseOptions }

export type SpaceOutput<Space, Ast> = Evaluate<
    SpaceTypes<Space, Ast> & {
        $root: SpaceRootFrom<Space, Ast>
    }
>

// TODO: Think of space more like other nodes, have types and values in parallel
type ToSpaceOutput<Space> = SpaceOutput<Space, Space.Parse<Space>>

export type SpaceRootFrom<Space, Ast> = Evaluate<{
    infer: InferSpaceRoot<Ast>
    ast: Ast
    type: TypeFn<Ast>
    extend: ExtendFn<Space>
    definitions: Space.DefinitionsOf<Space>
    options: SpaceOptions
}>

export type SpaceTypes<Definitions, Ast> = Evaluate<{
    [Alias in keyof Ast]: ToType<Get<Definitions, Alias>, Ast[Alias], Ast>
}>

export type InferSpaceRoot<Ast> = Evaluate<{
    [Alias in keyof Ast]: InferResolution<Ast, Alias>
}>

export type InferResolution<
    SpaceAst,
    Alias extends keyof SpaceAst
> = RootNode.Infer<SpaceAst[Alias], SpaceAst>

export type ExtendFn<S> = <ExtensionDefinitions, ExtensionRoot>(
    dictionary: ValidateDictionaryExtension<S, ExtensionDefinitions>,
    options?: ValidateSpaceOptions<
        Merge<Space.DefinitionsOf<S>, ExtensionDefinitions>,
        ExtensionRoot
    >
) => ToSpaceOutput<
    Merge<S, ExtensionDefinitions> & {
        $root: Merge<Space.RootOf<S>, ExtensionRoot>
    }
>

export type ValidateDictionaryExtension<BaseDict, ExtensionDict> = {
    [Alias in keyof ExtensionDict]: Root.Validate<
        ExtensionDict[Alias],
        Merge<BaseDict, ExtensionDict>
    >
}

export type Space = {
    Resolutions: unknown
    Meta: ParseOptions
}

export namespace Space {
    export type Definition = {
        Definitions: unknown
        Meta: ParseOptions
    }

    export type Parse<Def extends Definition> = Root.Parse<
        Def["Definitions"],
        Def
    >
}
