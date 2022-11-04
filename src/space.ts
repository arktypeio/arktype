import type { ArktypeConfig } from "./arktype.js"
import { Arktype } from "./arktype.js"
import { parseRoot } from "./parse/parse.js"
import type { parseAliases } from "./parse/space.js"
import type { Attributes } from "./parse/state/attributes.js"
import type { inferAst } from "./traverse/infer.js"
import type { validate } from "./traverse/validate.js"
import { chainableNoOpProxy } from "./utils/chainableNoOpProxy.js"
import type { dictionary } from "./utils/dynamicTypes.js"
import type { evaluate } from "./utils/generics.js"
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
