import { parseDefinition } from "../parse/definition.ts"
import { fullStringParse, maybeNaiveParse } from "../parse/string/string.ts"
import type { Scope } from "../scope.ts"
import { nodeToType } from "../type.ts"
import type { Domain } from "../utils/domains.ts"
import { throwInternalError, throwParseError } from "../utils/errors.ts"
import { deepFreeze } from "../utils/freeze.ts"
import type { defined } from "../utils/generics.ts"
import { isKeyOf, keysOf } from "../utils/generics.ts"
import { flatKeywords, keywords } from "./keywords.ts"
import type { TraversalNode, TypeNode, TypeSet } from "./node.ts"
import type {
    ExactValue,
    Predicate,
    ResolvedPredicate,
    TraversalPredicate
} from "./predicate.ts"

export const resolveIfIdentifier = (node: TypeNode, scope: Scope): TypeSet =>
    typeof node === "string" ? (resolve(scope, node) as TypeSet) : node

export const resolvePredicateIfIdentifier = (
    domain: Domain,
    predicate: Predicate,
    scope: Scope
) =>
    typeof predicate === "string"
        ? resolvePredicate(scope, predicate, domain)
        : predicate

export const isExactValue = <domain extends Domain>(
    node: TypeNode,
    domain: domain,
    scope: Scope
): node is { [_ in domain]: ExactValue<domain> } => {
    const resolution = resolveIfIdentifier(node, scope)
    return (
        nodeExtendsDomain(resolution, domain, scope) &&
        isExactValuePredicate(resolution[domain])
    )
}

export const isExactValuePredicate = (
    predicate: Predicate
): predicate is ExactValue =>
    typeof predicate === "object" && "value" in predicate

export const domainsOfNode = (node: TypeNode, scope: Scope): Domain[] =>
    keysOf(resolveIfIdentifier(node, scope))

export type DomainSubtypeNode<domain extends Domain> = {
    readonly [k in domain]: defined<TypeSet[domain]>
}

export const nodeExtendsDomain = <domain extends Domain>(
    node: TypeNode,
    domain: domain,
    scope: Scope
): node is DomainSubtypeNode<domain> => {
    const nodeDomains = domainsOfNode(node, scope)
    return nodeDomains.length === 1 && nodeDomains[0] === domain
}

// TODO: Move to parse
export const isResolvable = (scope: Scope, name: string) => {
    return isKeyOf(name, keywords) || scope.def[name] || scope.parent?.def[name]
        ? true
        : false
}

export const resolve = (scope: Scope, name: string) => {
    return resolveRecurse(scope, name, [])
}

const resolveFlat = (scope: Scope, name: string): TraversalNode => {
    if (isKeyOf(name, keywords)) {
        return flatKeywords[name]
    }
    resolveRecurse(scope, name, [])
    return scope.types[name].flat
}

const resolveRecurse = (
    scope: Scope,
    name: string,
    seen: string[]
): TypeSet => {
    if (isKeyOf(name, keywords)) {
        return keywords[name]
    }
    if (isKeyOf(name, scope.types)) {
        return scope.types[name].root as TypeSet
    }
    if (!scope.def[name]) {
        return (
            (scope.parent?.types[name].root as TypeSet) ??
            throwInternalError(`Unexpectedly failed to resolve alias '${name}'`)
        )
    }
    let root = parseDefinition(scope.def[name], scope)
    if (typeof root === "string") {
        if (seen.includes(root)) {
            return throwParseError(buildShallowCycleErrorMessage(name, seen))
        }
        seen.push(root)
        root = resolveRecurse(scope, root, seen)
    }
    // TODO: config?
    scope.types[name] = nodeToType(root, scope, {})
    return root as TypeSet
}

export const resolvePredicate = <domain extends Domain>(
    scope: Scope,
    name: string,
    domain: domain
) => {
    return resolvePredicateRecurse(scope, name, domain, [])
}

export const resolveFlatPredicate = (
    scope: Scope,
    name: string,
    domain: Domain
): TraversalPredicate => {
    const flatResolution = resolveFlat(scope, name)
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

const resolvePredicateRecurse = <domain extends Domain>(
    scope: Scope,
    name: string,
    domain: domain,
    seen: string[]
): ResolvedPredicate<domain, Scope> => {
    const resolution = resolve(scope, name)[domain]
    if (resolution === undefined) {
        return throwUnexpectedPredicateDomainError(name, domain)
    }
    if (typeof resolution !== "string") {
        return resolution as any
    }
    if (seen.includes(resolution)) {
        return throwParseError(buildShallowCycleErrorMessage(resolution, seen))
    }
    seen.push(resolution)
    return resolvePredicateRecurse(scope, resolution, domain, seen)
}

export const memoizedParse = (scope: Scope, def: string): TypeNode => {
    if (def in scope.cache) {
        return scope.cache[def]
    }
    const root = maybeNaiveParse(def, scope) ?? fullStringParse(def, scope)
    scope.cache[def] = deepFreeze(root)
    return root
}

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
