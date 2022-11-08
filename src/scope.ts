import type { ArktypeConfig } from "./arktype.js"
import { Arktype } from "./arktype.js"
import { parseRoot } from "./parse/parse.js"
import type { parseAliases } from "./parse/scope.js"
import type { Attributes } from "./parse/state/attributes.js"
import type { inferAst } from "./traverse/infer.js"
import type { validate } from "./traverse/validate.js"
import { chainableNoOpProxy } from "./utils/chainableNoOpProxy.js"
import { deepClone } from "./utils/deepClone.js"
import type { dictionary } from "./utils/dynamicTypes.js"
import type { evaluate } from "./utils/generics.js"
import type { LazyDynamicWrap } from "./utils/lazyDynamicWrap.js"
import { lazyDynamicWrap } from "./utils/lazyDynamicWrap.js"

const rawScope = (aliases: dictionary, config: ArktypeConfig = {}) => {
    const root = new ScopeRoot(aliases, config)
    const compiled: ArktypeScope = { $: root as any }
    for (const name in aliases) {
        compiled[name] = new Arktype(
            parseRoot(aliases[name], root),
            config,
            compiled
        )
    }
    return compiled
}

export const scope = lazyDynamicWrap(rawScope) as any as LazyDynamicWrap<
    InferredScopeFn,
    DynamicScopeFn
>

type InferredScopeFn = <
    aliases,
    parentScope extends dictionary = {},
    ast extends dictionary = parseAliases<aliases, parentScope>
>(
    aliases: validate<aliases, ast, ast>,
    config?: ArktypeConfig<parentScope>
) => ArktypeScope<inferScopeAst<ast, parentScope>>

type DynamicScopeFn = <aliases extends dictionary>(
    aliases: aliases,
    config?: ArktypeConfig
) => ArktypeScope<aliases>

export type ArktypeScope<inferred extends dictionary = dictionary> = {
    $: ScopeRoot<inferred>
} & inferredScopeToArktypes<inferred>

type inferredScopeToArktypes<inferred> = {
    [name in keyof inferred]: Arktype<inferred[name]>
}

export class ScopeRoot<inferred extends dictionary = dictionary> {
    parseCache: ParseCache = new ParseCache()

    constructor(
        public aliases: Record<keyof inferred, unknown>,
        public config: ArktypeConfig
    ) {}

    get infer(): inferred {
        return chainableNoOpProxy
    }
}

export class ParseCache {
    private cache: dictionary<Attributes | undefined> = {}

    get(definition: string) {
        if (definition in this.cache) {
            return deepClone(this.cache[definition])
        }
    }

    set(definition: string, attributes: Attributes) {
        this.cache[definition] = attributes
    }
}

export type inferScopeAst<
    rootAst extends dictionary,
    scope extends dictionary
> = evaluate<{
    [name in keyof rootAst]: inferAst<rootAst[name], scope, rootAst>
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
