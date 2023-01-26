import { parseDefinition } from "../parse/definition.ts"
import { fullStringParse, maybeNaiveParse } from "../parse/string/string.ts"
import type { ScopeRoot } from "../scope.ts"
import type { Type } from "../type.ts"
import { nodeToType } from "../type.ts"
import type { Domain } from "../utils/domains.ts"
import { throwInternalError, throwParseError } from "../utils/errors.ts"
import { deepFreeze } from "../utils/freeze.ts"
import type { defined } from "../utils/generics.ts"
import { hasKey, keysOf } from "../utils/generics.ts"
import type { TypeNode, TypeResolution } from "./node.ts"
import { compileNode } from "./node.ts"
import type { Predicate } from "./predicate.ts"
import type { LiteralRules } from "./rules/rules.ts"

export const resolveIfIdentifier = (
    node: TypeNode,
    $: ScopeRoot
): TypeResolution => (typeof node === "string" ? resolve(node, $).node : node)

export const isLiteralNode = <domain extends Domain>(
    node: TypeNode,
    domain: domain,
    $: ScopeRoot
): node is { [_ in domain]: LiteralRules<domain> } => {
    const resolution = resolveIfIdentifier(node, $)
    return (
        nodeExtendsDomain(resolution, domain, $) &&
        isLiteralCondition(resolution[domain])
    )
}

export const isLiteralCondition = (
    predicate: Predicate
): predicate is LiteralRules =>
    typeof predicate === "object" && "value" in predicate

export const domainsOfNode = (node: TypeNode, $: ScopeRoot): Domain[] =>
    keysOf(resolveIfIdentifier(node, $))

export type DomainSubtypeNode<domain extends Domain> = {
    readonly [k in domain]: defined<TypeResolution[domain]>
}

export const nodeExtendsDomain = <domain extends Domain>(
    node: TypeNode,
    domain: domain,
    $: ScopeRoot
): node is DomainSubtypeNode<domain> => {
    const nodeDomains = domainsOfNode(node, $)
    return nodeDomains.length === 1 && nodeDomains[0] === domain
}

// TODO: Move to parse
export const isResolvable = (name: string, $: ScopeRoot) => {
    return $.aliases[name] ? true : false
}

export const resolve = (name: string, $: ScopeRoot) => {
    return resolveRecurse(name, [], $)
}

const resolveRecurse = (name: string, seen: string[], $: ScopeRoot): Type => {
    if (hasKey($.cache.types, name)) {
        return $.cache.types[name]
    }
    if (!$.aliases[name]) {
        return throwInternalError(
            `Unexpectedly failed to resolve alias '${name}'`
        )
    }
    // TODO: Check shallow cycle errors
    let resolution = parseDefinition($.aliases[name], $)
    if (typeof resolution === "string") {
        if (seen.includes(resolution)) {
            return throwParseError(writeShallowCycleErrorMessage(name, seen))
        }
        seen.push(resolution)
        resolution = resolveRecurse(resolution, seen, $).node
    }
    // temporarily set the TraversalNode to an alias that will be used for cyclic resolutions
    const type = nodeToType(resolution, [["alias", name]], $, {})
    $.cache.types[name] = type
    type.flat = compileNode(resolution, $)
    return type
}

export const memoizedParse = (def: string, $: ScopeRoot): TypeNode => {
    if (hasKey($.cache.nodes, def)) {
        return $.cache.nodes[def]
    }
    const resolution = maybeNaiveParse(def, $) ?? fullStringParse(def, $)
    $.cache.nodes[def] = deepFreeze(resolution)
    return resolution
}

export const writeShallowCycleErrorMessage = (name: string, seen: string[]) =>
    `Alias '${name}' has a shallow resolution cycle: ${[...seen, name].join(
        "=>"
    )}`
