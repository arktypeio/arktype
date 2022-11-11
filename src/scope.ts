import type { ArktypeConfig } from "./arktype.js"
import { Type } from "./arktype.js"
import { parseRoot } from "./parse/parse.js"
import type { Attributes } from "./parse/state/attributes/attributes.js"
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
    const compiled: Scope = { $: root as any }
    for (const name in aliases) {
        const attributes = parseRoot(aliases[name], compiled)
        root.attributes[name] = attributes
        root.parseCache.set(name, attributes)
        compiled[name] = new Type(attributes, config, compiled)
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
) => Scope<inferScopeAst<ast, parentScope>>

type DynamicScopeFn = <aliases extends dictionary>(
    aliases: aliases,
    config?: ArktypeConfig
) => Scope<aliases>

export type Scope<inferred extends dictionary = dictionary> = {
    $: ScopeRoot<inferred>
} & inferredScopeToArktypes<inferred>

type inferredScopeToArktypes<inferred> = {
    [name in keyof inferred]: Type<inferred[name]>
}

export class ScopeRoot<inferred extends dictionary = dictionary> {
    parseCache = new ParseCache()

    attributes = {} as Record<keyof inferred, Attributes>

    constructor(
        public aliases: Record<keyof inferred, unknown>,
        public config: ArktypeConfig<dictionary>
    ) {}

    get infer(): inferred {
        return chainableNoOpProxy
    }
}

export class ParseCache {
    private cache: dictionary<Attributes | undefined> = {}

    constructor() {}

    get(definition: string) {
        if (definition in this.cache) {
            return deepClone(this.cache[definition])
        }
    }

    set(definition: string, attributes: Attributes) {
        this.cache[definition] = attributes
    }
}

type parseAliases<aliases, scope extends dictionary> = evaluate<{
    [name in keyof aliases]: parseRoot<aliases[name], aliases & scope>
}>

type inferScopeAst<
    rootAst extends dictionary,
    scope extends dictionary
> = evaluate<{
    [name in keyof rootAst]: inferAst<rootAst[name], scope, rootAst>
}>
