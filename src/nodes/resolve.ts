import { parseDefinition } from "../parse/definition.ts"
import { fullStringParse, maybeNaiveParse } from "../parse/string/string.ts"
import type { Scope } from "../scope.ts"
import { nodeToType } from "../type.ts"
import type { Domain } from "../utils/domains.ts"
import { throwInternalError, throwParseError } from "../utils/errors.ts"
import { deepFreeze } from "../utils/freeze.ts"
import type { defined } from "../utils/generics.ts"
import { isKeyOf, keysOf } from "../utils/generics.ts"
import { getFlatKeywords, keywords } from "./keywords.ts"
import type { TraversalNode, TypeNode, TypeRoot } from "./node.ts"
import { compileNode } from "./node.ts"
import type {
    ExactValue,
    Predicate,
    ResolvedPredicate,
    TraversalPredicate
} from "./predicate.ts"

export const resolveIfIdentifier = (node: TypeNode, $: Scope): TypeRoot =>
    typeof node === "string" ? (resolve(node, $) as TypeRoot) : node

export const resolvePredicateIfIdentifier = (
    domain: Domain,
    predicate: Predicate,
    $: Scope
) =>
    typeof predicate === "string"
        ? resolvePredicate(predicate, domain, $)
        : predicate

export const isExactValue = <domain extends Domain>(
    node: TypeNode,
    domain: domain,
    $: Scope
): node is { [_ in domain]: ExactValue<domain> } => {
    const resolution = resolveIfIdentifier(node, $)
    return (
        nodeExtendsDomain(resolution, domain, $) &&
        isExactValuePredicate(resolution[domain])
    )
}

export const isExactValuePredicate = (
    predicate: Predicate
): predicate is ExactValue =>
    typeof predicate === "object" && "value" in predicate

export const domainsOfNode = (node: TypeNode, $: Scope): Domain[] =>
    keysOf(resolveIfIdentifier(node, $))

export type DomainSubtypeNode<domain extends Domain> = {
    readonly [k in domain]: defined<TypeRoot[domain]>
}

export const nodeExtendsDomain = <domain extends Domain>(
    node: TypeNode,
    domain: domain,
    $: Scope
): node is DomainSubtypeNode<domain> => {
    const nodeDomains = domainsOfNode(node, $)
    return nodeDomains.length === 1 && nodeDomains[0] === domain
}

// TODO: Move to parse
export const isResolvable = (name: string, $: Scope) => {
    return isKeyOf(name, keywords) || $.aliases[name] ? true : false
}

export const resolve = (name: string, $: Scope) => {
    return resolveRecurse(name, [], $)
}

export const resolveFlat = (name: string, $: Scope): TraversalNode => {
    if (isKeyOf(name, keywords)) {
        return getFlatKeywords()[name]
    }
    resolveRecurse(name, [], $)
    return $.cache.types[name].flat
}

// TODO: change return to Type?
const resolveRecurse = (name: string, seen: string[], $: Scope): TypeRoot => {
    if (isKeyOf(name, keywords)) {
        return keywords[name]
    }
    if (isKeyOf(name, $.cache.types)) {
        return $.cache.types[name].root
    }
    if (!$.aliases[name]) {
        return throwInternalError(
            `Unexpectedly failed to resolve alias '${name}'`
        )
    }
    let root = parseDefinition($.aliases[name], $)
    if (typeof root === "string") {
        if (seen.includes(root)) {
            return throwParseError(buildShallowCycleErrorMessage(name, seen))
        }
        seen.push(root)
        root = resolveRecurse(root, seen, $)
    }
    // temporarily set the TraversalNode to an alias that will be used for cyclic resolutions
    const type = nodeToType(root, [["alias", name]], $, {})
    $.cache.types[name] = type
    type.flat = compileNode(root, $)
    return root as TypeRoot
}

export const resolvePredicate = <domain extends Domain>(
    name: string,
    domain: domain,
    $: Scope
) => {
    return resolvePredicateRecurse(name, domain, [], $)
}

export const resolveFlatPredicate = (
    name: string,
    domain: Domain,
    $: Scope
): TraversalPredicate => {
    const flatResolution = resolveFlat(name, $)
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
    seen: string[],
    $: Scope
): ResolvedPredicate<domain, Scope> => {
    const resolution = resolve(name, $)[domain]
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
    return resolvePredicateRecurse(resolution, domain, seen, $)
}

export const memoizedParse = (def: string, $: Scope): TypeNode => {
    if (def in $.cache) {
        return $.cache.nodes[def]
    }
    const root = maybeNaiveParse(def, $) ?? fullStringParse(def, $)
    $.cache.nodes[def] = deepFreeze(root)
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
