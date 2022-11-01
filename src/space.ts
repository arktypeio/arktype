import type { InferAst } from "./ast/infer.js"
import type { Validate } from "./ast/validate.js"
import type { Attributes } from "./attributes/shared.js"
import type { dictionary } from "./internal.js"
import type { parseAliases } from "./parser/space.js"
import type { ArktypeConfig } from "./type.js"
import { Arktype, parse } from "./type.js"
import { chainableNoOpProxy } from "./utils/chainableNoOpProxy.js"
import type { Evaluate } from "./utils/generics.js"
import type { LazyDynamicWrap } from "./utils/lazyDynamicWrap.js"
import { lazyDynamicWrap } from "./utils/lazyDynamicWrap.js"

const rawSpace = (aliases: dictionary, config: ArktypeConfig = {}) => {
    const root: SpaceRoot = {
        infer: chainableNoOpProxy,
        config,
        aliases,
        attributes: {},
        cache: {}
    }
    const compiled: ArktypeSpace = { $: root as any }
    for (const name in aliases) {
        const attributes = parse(aliases[name], compiled)
        root.attributes[name] = attributes
        compiled[name] = new Arktype(attributes, config, compiled)
    }
    return compiled
}

export const space = lazyDynamicWrap(rawSpace) as any as LazyDynamicWrap<
    InferredSpaceFn,
    DynamicSpaceFn
>

type InferredSpaceFn = <aliases, resolutions = parseAliases<aliases>>(
    aliases: Validate<aliases, resolutions, resolutions>,
    config?: ArktypeConfig
) => ArktypeSpace<inferResolutions<resolutions>>

type DynamicSpaceFn = <aliases extends dictionary>(
    aliases: aliases,
    config?: ArktypeConfig
) => ArktypeSpace<aliases>

export type ArktypeSpace<inferred = dictionary> = {
    $: SpaceRoot<inferred>
} & resolutionsToArktypes<inferred>

export const defaultSpace = rawSpace({})

type resolutionsToArktypes<resolutions> = {
    [alias in keyof resolutions]: Arktype<
        InferAst<resolutions[alias], resolutions>
    >
}

export type SpaceRoot<inferred = dictionary> = {
    aliases: Record<keyof inferred, unknown>
    attributes: Record<keyof inferred, Attributes>
    infer: inferResolutions<inferred>
    config: ArktypeConfig
    cache: dictionary<Attributes>
}

export type inferResolutions<resolutions> = Evaluate<{
    [k in keyof resolutions]: InferAst<resolutions[k], resolutions>
}>

// TODO: Ensure there are no extraneous types/space calls from testing
// TODO: Ensure "Dict"/"dictionary" etc. is not used anywhere referencing space
// export type ExtendFn<S> = <ExtensionDefinitions, ExtensionRoot>(
//     dictionary: ValidateDictionaryExtension<S, ExtensionDefinitions>,
//     options?: ValidateSpaceOptions<
//         Merge<Space.DefinitionsOf<S>, ExtensionDefinitions>,
//         ExtensionRoot
//     >
// ) => ToSpaceOutput<
//     Merge<S, ExtensionDefinitions> & {
//         $root: Merge<Space.RootOf<S>, ExtensionRoot>
//     }
// >

// export type ExtendSpaceFn<S extends Space.Definition> = <Aliases, Meta = {}>(
//     dictionary: Space.ValidateAliases<Aliases, Meta>,
//     options?: Conform<Meta, Space.ValidateMeta<Meta, Aliases>>
// ) => ToSpaceOutput<Aliases>

// export type ValidateDictionaryExtension<BaseDict, ExtensionDict> = {
//     [Alias in keyof ExtensionDict]: Root.Validate<
//         ExtensionDict[Alias],
//         Merge<BaseDict, ExtensionDict>
//     >
// }

// export type ReferencesOptions<Filter extends string = string> = {
//     filter?: FilterFn<Filter>
// }

// export type FilterFn<Filter extends string> =
//     | ((reference: string) => reference is Filter)
//     | ((reference: string) => boolean)

// export type ReferencesFn<Ast> = <Options extends ReferencesOptions = {}>(
//     options?: Options
// ) => ElementOf<
//     ReferencesOf<
//         Ast,
//         Options["filter"] extends FilterFn<infer Filter> ? Filter : string
//     >
// >[]

// collectReferences(
//     args: References.ReferencesOptions,
//     collected: KeySet
// ) {
//     if (!args.filter || args.filter(this.def)) {
//         collected[this.def] = 1
//     }
// }
