import type { ArktypeConfig } from "./arktype.js"
import { Arktype } from "./arktype.js"
import type { inferAst } from "./ast/infer.js"
import type { validate } from "./ast/validate.js"
import type { Attributes } from "./attributes/shared.js"
import type { dictionary, evaluate } from "./internal.js"
import { parseRoot } from "./parser/parse.js"
import type { parseAliases } from "./parser/space.js"
import { chainableNoOpProxy } from "./utils/chainableNoOpProxy.js"
import type { LazyDynamicWrap } from "./utils/lazyDynamicWrap.js"
import { lazyDynamicWrap } from "./utils/lazyDynamicWrap.js"

const rawSpace = (aliases: dictionary, config: ArktypeConfig = {}) => {
    const root = new SpaceRoot(aliases, config)
    const compiled: ArktypeSpace = { $: root as any }
    for (const name in aliases) {
        compiled[name] = new Arktype(
            parseRoot(aliases[name], root),
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

type InferredSpaceFn = <aliases, ast = parseAliases<aliases>>(
    aliases: validate<aliases, ast, ast>,
    config?: ArktypeConfig
) => ArktypeSpace<inferSpaceAst<ast>>

type DynamicSpaceFn = <aliases extends dictionary>(
    aliases: aliases,
    config?: ArktypeConfig
) => ArktypeSpace<aliases>

export type ArktypeSpace<inferred extends dictionary = dictionary> = {
    $: SpaceRoot<inferred>
} & inferredSpaceToArktypes<inferred>

type inferredSpaceToArktypes<inferred> = {
    [name in keyof inferred]: Arktype<inferred[name]>
}

export class SpaceRoot<inferred extends dictionary = dictionary> {
    parseCache: dictionary<Attributes | undefined> = {}

    constructor(
        public aliases: Record<keyof inferred, unknown>,
        public config: ArktypeConfig
    ) {}

    get infer(): inferred {
        return chainableNoOpProxy
    }
}

export type inferSpaceAst<root> = evaluate<{
    [name in keyof root]: inferAst<root[name], root>
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
