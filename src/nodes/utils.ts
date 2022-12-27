import type { Scope } from "../scope.ts"
import type { Domain } from "../utils/domains.ts"
import { throwInternalError } from "../utils/errors.ts"
import type { defined } from "../utils/generics.ts"
import { keysOf } from "../utils/generics.ts"
import type { TypeNode, TypeSet } from "./node.ts"
import type { ExactValue, Predicate } from "./predicate.ts"

export const resolveIfIdentifier = (node: TypeNode, scope: Scope): TypeSet =>
    typeof node === "string" ? (scope.resolve(node) as TypeSet) : node

export const resolvePredicateIfIdentifier = (
    domain: Domain,
    predicate: Predicate,
    scope: Scope
) =>
    typeof predicate === "string"
        ? scope.resolvePredicate(predicate, domain)
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

const isResolvable = (name: string) => {
    return isKeyOf(name, keywords) ||
        this.aliases[name] ||
        this.parent?.roots[name]
        ? true
        : false
}

const resolve = (name: string) => {
    return this.resolveRecurse(name, [])
}

const resolveFlat = (name: string): TraversalNode => {
    if (isKeyOf(name, keywords)) {
        return flatKeywords[name]
    }
    this.resolveRecurse(name, [])
    return this.flatRoots[name]
}

const resolveRecurse = (name: string, seen: string[]): TypeSet => {
    if (isKeyOf(name, keywords)) {
        return keywords[name]
    }
    if (isKeyOf(name, this.roots)) {
        return this.roots[name] as TypeSet
    }
    if (!this.aliases[name]) {
        return (
            this.parent?.roots[name] ??
            throwInternalError(`Unexpectedly failed to resolve alias '${name}'`)
        )
    }
    let root = parseDefinition(this.aliases[name], this as Scope)
    if (typeof root === "string") {
        if (seen.includes(root)) {
            return throwParseError(buildShallowCycleErrorMessage(name, seen))
        }
        seen.push(root)
        root = this.resolveRecurse(root, seen)
    }
    this.roots[name as keyof inferred] = root as any
    this.flatRoots[name as keyof inferred] = compileNode(root, this as Scope)
    return root as TypeSet
}

const resolvePredicate = <domain extends Domain>(
    name: string,
    domain: domain
) => {
    return this.resolvePredicateRecurse(name, domain, [])
}

const resolveFlatPredicate = (
    name: string,
    domain: Domain
): TraversalPredicate => {
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

const resolvePredicateRecurse = <domain extends Domain>(
    name: string,
    domain: domain,
    seen: string[]
): ResolvedPredicate<domain, { inferred: inferred; aliases: {} }> => {
    const resolution = this.resolve(name)[domain]
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
    return this.resolvePredicateRecurse(resolution, domain, seen)
}

const memoizedParse = (def: string): TypeNode => {
    if (def in this.cache) {
        return this.cache[def]
    }
    const root =
        maybeNaiveParse(def, this as Scope) ??
        fullStringParse(def, this as Scope)
    this.cache[def] = deepFreeze(root)
    return root
}

const throwUnexpectedPredicateDomainError = (
    name: string,
    expectedDomain: Domain
) =>
    throwInternalError(
        `Expected '${name}' to have a definition including '${expectedDomain}'`
    )
