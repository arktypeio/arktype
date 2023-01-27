import { parseDefinition } from "../parse/definition.ts"
import { fullStringParse, maybeNaiveParse } from "../parse/string/string.ts"
import type { Scope } from "../scope.ts"
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

export const resolveNode = (node: TypeNode, $: Scope): TypeResolution =>
    typeof node === "string" ? resolve(node, $).node : node

export const isLiteralNode = <domain extends Domain>(
    node: TypeNode,
    domain: domain,
    $: Scope
): node is { [_ in domain]: LiteralRules<domain> } => {
    const resolution = resolveNode(node, $)
    return (
        nodeExtendsDomain(resolution, domain, $) &&
        isLiteralCondition(resolution[domain])
    )
}

export const isLiteralCondition = (
    predicate: Predicate
): predicate is LiteralRules =>
    typeof predicate === "object" && "value" in predicate

export const domainsOfNode = (node: TypeNode, $: Scope): Domain[] =>
    keysOf(resolveNode(node, $))

export type DomainSubtypeNode<domain extends Domain> = {
    readonly [k in domain]: defined<TypeResolution[domain]>
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
    return $.cache.locals[name] || $.aliases[name] ? true : false
}

export const resolve = (name: string, $: Scope) => {
    return resolveRecurse(name, [], $)
}

const resolveRecurse = (name: string, seen: string[], $: Scope): Type => {
    if (hasKey($.cache.locals, name)) {
        return $.cache.locals[name]
    }
    if (!$.aliases[name]) {
        return throwInternalError(
            `Unexpectedly failed to resolve alias '${name}'`
        )
    }
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
    $.cache.locals[name] = type
    type.flat = compileNode(resolution, $)
    return type
}

export const memoizedParse = (def: string, $: Scope): TypeNode => {
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
