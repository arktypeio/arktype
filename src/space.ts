import type { inferAst } from "./ast/infer.js"
import type { validate } from "./ast/validate.js"
import type { dictionary } from "./internal.js"
import { Root } from "./parser/root.js"
import type { ParseSpace } from "./parser/space.js"
import type { ArktypeConfig } from "./type.js"
import { Arktype } from "./type.js"
import { chainableNoOpProxy } from "./utils/chainableNoOpProxy.js"
import type { Evaluate } from "./utils/generics.js"
import type { LazyDynamicWrap } from "./utils/lazyDynamicWrap.js"
import { lazyDynamicWrap } from "./utils/lazyDynamicWrap.js"

const rawSpace = (aliases: dictionary, config: ArktypeConfig = {}) => {
    const result: ArktypeSpace = {
        $: { infer: chainableNoOpProxy, config, aliases } as any
    }
    for (const name in aliases) {
        result[name] = new Arktype(
            Root.parse(aliases[name], {
                aliases,
                path: ""
            }),
            config,
            result
        )
    }
    return result
}

export const space = lazyDynamicWrap(rawSpace) as any as LazyDynamicWrap<
    InferredSpaceFn,
    DynamicSpaceFn
>

type InferredSpaceFn = <Aliases, Resolutions = ParseSpace<Aliases>>(
    aliases: validate<Aliases, Resolutions, Resolutions>,
    config?: ArktypeConfig
) => ArktypeSpace<Resolutions>

type DynamicSpaceFn = <Aliases extends dictionary>(
    aliases: Aliases,
    config?: ArktypeConfig
) => ArktypeSpace<Aliases>

export type ArktypeSpace<resolutions = dictionary> = {
    $: SpaceMeta<resolutions>
} & resolutionsToArktypes<resolutions>

type resolutionsToArktypes<resolutions> = {
    [alias in keyof resolutions]: Arktype<
        inferAst<resolutions[alias], resolutions>,
        resolutions[alias]
    >
}

export type SpaceMeta<resolutions = dictionary> = {
    infer: inferResolutions<resolutions>
    config: ArktypeConfig
    ast: resolutions
    aliases: Record<keyof resolutions, unknown>
}

export type inferResolutions<resolutions> = Evaluate<{
    [alias in keyof resolutions]: inferAst<resolutions[alias], resolutions>
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
