import { getFlatKeywords, keywords } from "./nodes/keywords.ts"
import type { TraversalNode, TypeNode, TypeRoot } from "./nodes/node.ts"
import type {
    ExactValue,
    Predicate,
    ResolvedPredicate,
    TraversalPredicate
} from "./nodes/predicate.ts"
import type { inferDefinition, validateDefinition } from "./parse/definition.ts"
import { parseDefinition } from "./parse/definition.ts"
import { fullStringParse, maybeNaiveParse } from "./parse/string/string.ts"
import type { parseType, Type, TypeParser } from "./type.ts"
import { isType, nodeToType } from "./type.ts"
import { chainableNoOpProxy } from "./utils/chainableNoOpProxy.ts"
import type { Domain } from "./utils/domains.ts"
import { throwInternalError, throwParseError } from "./utils/errors.ts"
import { deepFreeze } from "./utils/freeze.ts"
import type {
    defined,
    Dict,
    evaluate,
    isTopType,
    merge,
    stringKeyOf
} from "./utils/generics.ts"
import { isKeyOf, keysOf } from "./utils/generics.ts"
import { lazyDynamicWrap } from "./utils/lazyDynamicWrap.ts"
import type { LazyDynamicWrap } from "./utils/lazyDynamicWrap.ts"

// TODO: Integrate parent
const composeScopeParser = <parent extends Scope>(parent?: parent) =>
    lazyDynamicWrap((aliases: Dict) => new Scope(aliases)) as ScopeParser<
        Scope extends parent ? {} : parent
    >

export const composeTypeParser = <$ extends Scope>($: $): TypeParser<$> =>
    lazyDynamicWrap((def, traits = {}) => {
        const node = $.resolveIfIdentifier(parseDefinition(def, $))
        return nodeToType(node, $, traits)
    })

type ScopeParser<parent> = LazyDynamicWrap<
    InferredScopeParser<parent>,
    DynamicScopeParser<parent>
>

type InferredScopeParser<parent> = <defs>(
    defs: validateScope<defs, parent>
) => Scope<parseScope<merge<parent, defs>>>

type DynamicScopeParser<parent> = <defs extends Dict>(
    defs: defs
) => Scope<Types<stringKeyOf<parent & defs>>>

export type Types<name extends string = string> = { [k in name]: Type }

type ScopeCache<types = Types> = {
    nodes: { [def in string]: TypeNode }
    types: Partial<types>
}

export class Scope<types = Types> {
    private cache: ScopeCache<types> = {
        nodes: {},
        types: {}
    }

    // alias for this used to avoid TS errors when passed to a function
    $: Scope<Types>
    type: TypeParser<types>
    extend: ScopeParser<types>

    constructor(public aliases: { readonly [k in keyof types]: unknown }) {
        this.$ = this as Scope<Types>
        this.type = composeTypeParser(this.$)
        this.extend = composeScopeParser(this.$)
    }

    get infer(): inferScope<types> {
        return chainableNoOpProxy
    }

    compile() {
        const types = {} as types
        for (const name in this.aliases) {
            const def = this.aliases[name]
            types[name] =
                typeof def === "function"
                    ? isType(def)
                        ? def
                        : def()
                    : nodeToType(
                          this.resolveIfIdentifier(
                              parseDefinition(def, this.$)
                          ),
                          this.$,
                          {}
                      )
        }
        return types
    }

    resolveIfIdentifier(node: TypeNode): TypeRoot {
        return typeof node === "string"
            ? (this.resolve(node) as TypeRoot)
            : node
    }

    resolvePredicateIfIdentifier(domain: Domain, predicate: Predicate) {
        return typeof predicate === "string"
            ? this.resolvePredicate(predicate, domain)
            : predicate
    }

    isExactValue<domain extends Domain>(
        node: TypeNode,
        domain: domain
    ): node is { [_ in domain]: ExactValue<domain> } {
        const resolution = this.resolveIfIdentifier(node)
        return (
            this.nodeExtendsDomain(resolution, domain) &&
            this.isExactValuePredicate(resolution[domain])
        )
    }

    isExactValuePredicate(predicate: Predicate): predicate is ExactValue {
        return typeof predicate === "object" && "value" in predicate
    }

    domainsOfNode(node: TypeNode): Domain[] {
        return keysOf(this.resolveIfIdentifier(node))
    }

    nodeExtendsDomain<domain extends Domain>(
        node: TypeNode,
        domain: domain
    ): node is DomainSubtypeNode<domain> {
        const nodeDomains = this.domainsOfNode(node)
        return nodeDomains.length === 1 && nodeDomains[0] === domain
    }

    // TODO: Move to parse
    isResolvable = (name: string) => {
        return isKeyOf(name, keywords) || this.aliases[name] ? true : false
    }

    resolve(name: string) {
        return this.resolveRecurse(name, [])
    }

    resolveFlat(name: string): TraversalNode {
        if (isKeyOf(name, keywords)) {
            return getFlatKeywords()[name]
        }
        this.resolveRecurse(name, [])
        return this.cache.types[name].flat
    }

    resolveRecurse(name: string, seen: string[]): TypeRoot {
        if (isKeyOf(name, keywords)) {
            return keywords[name]
        }
        if (isKeyOf(name, this.cache.types)) {
            return this.cache.types[name].root as TypeRoot
        }
        if (!this.aliases[name]) {
            return throwInternalError(
                `Unexpectedly failed to resolve alias '${name}'`
            )
        }
        let root = parseDefinition(this.aliases[name], this.$)
        if (typeof root === "string") {
            if (seen.includes(root)) {
                return throwParseError(
                    buildShallowCycleErrorMessage(name, seen)
                )
            }
            seen.push(root)
            root = this.resolveRecurse(root, seen)
        }
        this.cache.types[name] = nodeToType(root, this.$, {})
        return root as TypeRoot
    }

    resolvePredicate<domain extends Domain>(name: string, domain: domain) {
        return this.resolvePredicateRecurse(name, domain, [])
    }

    resolveFlatPredicate(
        $: Scope,
        name: string,
        domain: Domain
    ): TraversalPredicate {
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

    resolvePredicateRecurse<domain extends Domain>(
        name: string,
        domain: domain,
        seen: string[]
    ): ResolvedPredicate<domain, Scope> {
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
            return this.cache.nodes[def]
        }
        const root =
            maybeNaiveParse(def, this.$) ?? fullStringParse(def, this.$)
        this.cache.nodes[def] = deepFreeze(root)
        return root
    }
}

type parseScope<aliases> = evaluate<{
    [k in keyof aliases]: isTopType<aliases[k]> extends true
        ? Type
        : aliases[k] extends Type
        ? aliases[k]
        : aliases[k] extends (() => infer r extends Type)
        ? r
        : parseType<aliases[k], aliases, {}>
}>

type validateScope<aliases, parent> = {
    // somehow using "any" as the thunk return type does not cause a circular
    // reference error (every other type does)
    [name in keyof aliases]: aliases[name] extends () => any
        ? aliases[name]
        : validateDefinition<aliases[name], merge<parent, aliases>>
}

type inferScope<types> = {
    [k in keyof types]: types[k] extends { infer: infer data } ? data : never
}

// TODO: test perf diff between Type/infer
export type inferResolution<resolution, $> = resolution extends () => {
    infer: infer data
}
    ? data
    : resolution extends { infer: infer data }
    ? data
    : inferDefinition<resolution, $>

export const scope: ScopeParser<{}> = composeScopeParser()

const rootScope = composeScopeParser()({})

export const type: TypeParser<{}> = composeTypeParser(rootScope)

const throwUnexpectedPredicateDomainError = (
    name: string,
    expectedDomain: Domain
) =>
    throwInternalError(
        `Expected '${name}' to have a definition including '${expectedDomain}'`
    )

export const buildShallowCycleErrorMessage = (name: string, seen: string[]) =>
    `Alias '${name}' has a shallow resolution cycle: ${[...seen, name].join(
        "=>"
    )}`

export type DomainSubtypeNode<domain extends Domain> = {
    readonly [k in domain]: defined<TypeRoot[domain]>
}
