import type { inferAst } from "./ast/infer.js"
import type { validate } from "./ast/validate.js"
import type { Attributes } from "./attributes/shared.js"
import type { dictionary } from "./internal.js"
import { initializeParserContext } from "./parser/common.js"
import type { parseAliases } from "./parser/space.js"
import { Str } from "./parser/string/string.js"
import type { ArktypeConfig } from "./type.js"
import { Arktype } from "./type.js"
import { chainableNoOpProxy } from "./utils/chainableNoOpProxy.js"
import { deepClone } from "./utils/deepClone.js"
import type { evaluate } from "./utils/generics.js"
import type { LazyDynamicWrap } from "./utils/lazyDynamicWrap.js"
import { lazyDynamicWrap } from "./utils/lazyDynamicWrap.js"

const rawSpace = (aliases: dictionary, config: ArktypeConfig = {}) => {
    const root = new SpaceRoot(aliases, config)
    const compiled: ArktypeSpace = { $: root as any }
    for (const name in aliases) {
        compiled[name] = new Arktype(
            root.parseMemoizable(name),
            config,
            compiled
        )
    }
    return compiled
}

export const space = lazyDynamicWrap(rawSpace) as any as LazyDynamicWrap<
    InferredSpaceFn,
    DynamicSpaceFn
>

type InferredSpaceFn = <aliases, resolutions = parseAliases<aliases>>(
    aliases: validate<aliases, resolutions, resolutions>,
    config?: ArktypeConfig
) => ArktypeSpace<inferResolutions<resolutions>>

type DynamicSpaceFn = <aliases extends dictionary>(
    aliases: aliases,
    config?: ArktypeConfig
) => ArktypeSpace<aliases>

export type ArktypeSpace<resolutions extends dictionary = dictionary> = {
    $: SpaceRoot<resolutions>
} & resolutionsToArktypes<resolutions>

export const defaultSpace = rawSpace({})

type resolutionsToArktypes<resolutions> = {
    [alias in keyof resolutions]: Arktype<resolutions[alias]>
}

export class SpaceRoot<resolutions extends dictionary = dictionary> {
    private parseCache: dictionary<Attributes> = {}

    constructor(
        public aliases: Record<keyof resolutions, unknown>,
        public config: ArktypeConfig
    ) {}

    get infer(): resolutions {
        return chainableNoOpProxy
    }

    parseMemoizable(definition: string) {
        if (!this.parseCache[definition]) {
            this.parseCache[definition] = Str.parse(
                definition,
                initializeParserContext(this)
            )
        }
        return deepClone(this.parseCache[definition])
    }
}

export type inferResolutions<resolutions> = evaluate<{
    [k in keyof resolutions]: inferAst<resolutions[k], resolutions>
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
