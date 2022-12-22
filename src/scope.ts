import { flatKeywords, keywords } from "./nodes/keywords.js"
import type { TraversalNode, TypeNode, TypeSet } from "./nodes/node.js"
import { compileNode } from "./nodes/node.js"
import type {
    ResolvedPredicate,
    TraversalPredicate
} from "./nodes/predicate.js"
import type { inferDefinition, validateDefinition } from "./parse/definition.js"
import { parseDefinition } from "./parse/definition.js"
import { fullStringParse, maybeNaiveParse } from "./parse/string.js"
import type { Config } from "./type.js"
import { Type } from "./type.js"
import { chainableNoOpProxy } from "./utils/chainableNoOpProxy.js"
import type { Domain } from "./utils/domains.js"
import { throwInternalError, throwParseError } from "./utils/errors.js"
import { deepFreeze } from "./utils/freeze.js"
import type { Dict, evaluate } from "./utils/generics.js"
import { isKeyOf } from "./utils/generics.js"
import type { LazyDynamicWrap } from "./utils/lazyDynamicWrap.js"
import { lazyDynamicWrap } from "./utils/lazyDynamicWrap.js"

const rawScope = (aliases: Dict, config: Config = {}) => {
    const root = new ScopeRoot(aliases, config)
    const types: Scope<Dict> = { $: root as any }
    for (const name in aliases) {
        const node = root.resolve(name)
        types[name] = new Type(node, compileNode(node, root), config, types)
    }
    return types
}

export const scope = lazyDynamicWrap(rawScope) as any as LazyDynamicWrap<
    InferredScopeFn,
    DynamicScopeFn
>

let rootScope: Scope<{}> | undefined

export type RootScope = ScopeRoot<{}>

export const getRootScope = () => {
    rootScope ??= scope({}) as any
    return rootScope!
}

type InferredScopeFn = <aliases, inferredParent extends Dict = {}>(
    aliases: validateAliases<
        aliases,
        inferScopeContext<aliases, inferredParent>
    >,
    config?: Config<inferredParent>
) => Scope<inferAliases<aliases, inferredParent>>

type DynamicScopeFn = <aliases extends Dict>(
    aliases: aliases,
    config?: Config
) => Scope<{ [name in keyof aliases]: unknown }>

export type Scope<inferred extends Dict> = {
    $: ScopeRoot<inferred>
} & inferredScopeToArktypes<inferred>

export type DynamicScope = Scope<Dict>

type inferredScopeToArktypes<inferred> = {
    [name in keyof inferred]: Type<inferred[name]>
}

// TODO: decide if parsing primarily managed through scope or only resolution/caching

export class ScopeRoot<inferred extends Dict = Dict> {
    roots = {} as { [k in keyof inferred]: TypeSet<inferred> }
    flatRoots = {} as { [k in keyof inferred]: TraversalNode }

    // TODO: Add intersection cache
    private cache: { [def: string]: TypeNode } = {}

    constructor(
        public aliases: { readonly [name in keyof inferred]: unknown },
        public config: Config<Dict>
    ) {}

    get infer(): inferred {
        return chainableNoOpProxy
    }

    isResolvable(name: string) {
        return isKeyOf(name, keywords) ||
            this.aliases[name] ||
            this.config.scope?.$.roots[name]
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
                this.config.scope?.$.roots[name] ??
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
        this.roots[name as keyof inferred] = root as TypeSet<inferred>
        this.flatRoots[name as keyof inferred] = compileNode(
            root,
            this as ScopeRoot
        )
        return root
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
    ): ResolvedPredicate<domain, inferred> {
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

type validateAliases<aliases, scope extends Dict> = evaluate<{
    [name in keyof aliases]: validateDefinition<aliases[name], scope, false>
}>

type inferAliases<aliases, scope extends Dict> = evaluate<{
    [name in keyof aliases]: inferDefinition<
        aliases[name],
        scope,
        aliases,
        false
    >
}>

type inferScopeContext<aliases, scope extends Dict> = inferAliases<
    aliases,
    scope
> &
    scope

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
