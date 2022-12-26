import { flatKeywords, keywords } from "./nodes/keywords.ts"
import type { TraversalNode, TypeNode, TypeSet } from "./nodes/node.ts"
import { compileNode } from "./nodes/node.ts"
import type {
    ResolvedPredicate,
    TraversalPredicate
} from "./nodes/predicate.ts"
import type { inferDefinition, validateDefinition } from "./parse/definition.ts"
import { parseDefinition } from "./parse/definition.ts"
import { fullStringParse, maybeNaiveParse } from "./parse/string/string.ts"
import type { Type } from "./type.ts"
import { type } from "./type.ts"
import { chainableNoOpProxy } from "./utils/chainableNoOpProxy.ts"
import type { Domain } from "./utils/domains.ts"
import { throwInternalError, throwParseError } from "./utils/errors.ts"
import { deepFreeze } from "./utils/freeze.ts"
import type { Dict, evaluate, extend } from "./utils/generics.ts"
import { isKeyOf } from "./utils/generics.ts"
import type { LazyDynamicWrap } from "./utils/lazyDynamicWrap.ts"
import { lazyDynamicWrap } from "./utils/lazyDynamicWrap.ts"

const rawScope = (aliases: Dict, parent?: ScopeRoot) => {
    const root = new ScopeRoot(aliases, parent)
    const types: Scope = { $: root as any }
    const typeConfig = { scope: types }
    for (const name in aliases) {
        // TODO: Fix typeConfig
        types[name] = type.dynamic(aliases[name], typeConfig as any)
    }
    return types
}

export type S = {
    inferred: Dict
    aliases?: unknown
}

export type ScopeConfig<inferred extends Dict> = {
    scope?: Scope<inferred>
}

export const scope = lazyDynamicWrap(rawScope) as any as LazyDynamicWrap<
    InferredScopeFn,
    DynamicScopeFn
>

export type GlobalScope = extend<
    S,
    {
        inferred: {}
        aliases: {}
    }
>

let globalScope: Scope<{}> | undefined

export const getGlobalScope = () => {
    globalScope ??= scope({}) as any
    return globalScope!
}

type InferredScopeFn = <aliases, inferredParent extends Dict = {}>(
    aliases: validateAliases<
        aliases,
        inferScopeContext<aliases, inferredParent>
    >,
    config?: ScopeConfig<inferredParent>
) => Scope<inferAliases<aliases, inferredParent>>

type DynamicScopeFn = <aliases extends Dict>(
    aliases: aliases
) => Scope<{ [k in keyof aliases]: unknown }>

export type Scope<inferred extends Dict = Dict> = {
    $: ScopeRoot<inferred>
} & inferredScopeToTypes<inferred>

type inferredScopeToTypes<inferred extends Dict> = {
    [name in keyof inferred]: Type<inferred[name]>
}

// TODO: What can we build into this? Parsing/lookups etc.
export class ScopeRoot<inferred extends Dict = Dict> {
    roots = {} as {
        [k in keyof inferred]: TypeSet<{ inferred: inferred; aliases: {} }>
    }
    flatRoots = {} as { [k in keyof inferred]: TraversalNode }

    // TODO: Add intersection cache
    private cache: { [def: string]: TypeNode } = {}

    constructor(
        public aliases: { readonly [k in keyof inferred]: unknown },
        public parent?: ScopeRoot
    ) {}

    get infer(): inferred {
        return chainableNoOpProxy
    }

    isResolvable(name: string) {
        return isKeyOf(name, keywords) ||
            this.aliases[name] ||
            this.parent?.roots[name]
            ? true
            : false
    }

    resolve(name: string) {
        return this.resolveRecurse(name, [])
    }

    resolveFlat(name: string): TraversalNode {
        if (isKeyOf(name, keywords)) {
            return flatKeywords[name]
        }
        this.resolveRecurse(name, [])
        return this.flatRoots[name]
    }

    private resolveRecurse(name: string, seen: string[]): TypeSet {
        if (isKeyOf(name, keywords)) {
            return keywords[name]
        }
        if (isKeyOf(name, this.roots)) {
            return this.roots[name] as TypeSet
        }
        if (!this.aliases[name]) {
            return (
                this.parent?.roots[name] ??
                throwInternalError(
                    `Unexpectedly failed to resolve alias '${name}'`
                )
            )
        }
        let root = parseDefinition(this.aliases[name], this as ScopeRoot)
        if (typeof root === "string") {
            if (seen.includes(root)) {
                return throwParseError(
                    buildShallowCycleErrorMessage(name, seen)
                )
            }
            seen.push(root)
            root = this.resolveRecurse(root, seen)
        }
        this.roots[name as keyof inferred] = root as any
        this.flatRoots[name as keyof inferred] = compileNode(
            root,
            this as ScopeRoot
        )
        return root as TypeSet
    }

    resolvePredicate<domain extends Domain>(name: string, domain: domain) {
        return this.resolvePredicateRecurse(name, domain, [])
    }

    resolveFlatPredicate(name: string, domain: Domain): TraversalPredicate {
        const flatResolution = this.resolveFlat(name)
        if (typeof flatResolution === "string") {
            if (flatResolution !== domain) {
                return throwUnexpectedPredicateDomainError(name, domain)
            }
            // an empty predicate is satisfied by its domain alone
            return []
        }
        if (flatResolution[0][0] === "domains") {
            const predicate = flatResolution[0][1][domain]
            if (predicate === undefined) {
                return throwUnexpectedPredicateDomainError(name, domain)
            }
            return predicate
        }
        return (
            flatResolution[0][0] === "domain"
                ? flatResolution.slice(1)
                : flatResolution
        ) as TraversalPredicate
    }

    private resolvePredicateRecurse<domain extends Domain>(
        name: string,
        domain: domain,
        seen: string[]
    ): ResolvedPredicate<domain, { inferred: inferred; aliases: {} }> {
        const resolution = this.resolve(name)[domain]
        if (resolution === undefined) {
            return throwUnexpectedPredicateDomainError(name, domain)
        }
        if (typeof resolution !== "string") {
            return resolution as any
        }
        if (seen.includes(resolution)) {
            return throwParseError(
                buildShallowCycleErrorMessage(resolution, seen)
            )
        }
        seen.push(resolution)
        return this.resolvePredicateRecurse(resolution, domain, seen)
    }

    memoizedParse(def: string): TypeNode {
        if (def in this.cache) {
            return this.cache[def]
        }
        const root =
            maybeNaiveParse(def, this as ScopeRoot) ??
            fullStringParse(def, this as ScopeRoot)
        this.cache[def] = deepFreeze(root)
        return root
    }
}

type validateAliases<aliases, inferredContext extends Dict> = evaluate<{
    [name in keyof aliases]: validateDefinition<
        aliases[name],
        { inferred: inferredContext }
    >
}>

type inferAliases<aliases, inferredContext extends Dict> = evaluate<{
    [name in keyof aliases]: inferDefinition<
        aliases[name],
        {
            inferred: inferredContext
            aliases: aliases
        }
    >
}>

type inferScopeContext<aliases, inferredParent extends Dict> = inferAliases<
    aliases,
    inferredParent
> &
    inferredParent

export const buildShallowCycleErrorMessage = (name: string, seen: string[]) =>
    `Alias '${name}' has a shallow resolution cycle: ${[...seen, name].join(
        "=>"
    )}`

const throwUnexpectedPredicateDomainError = (
    name: string,
    expectedDomain: Domain
) =>
    throwInternalError(
        `Expected '${name}' to have a definition including '${expectedDomain}'`
    )
