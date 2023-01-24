import { parseDefinition } from "../parse/definition.ts"
import { fullStringParse, maybeNaiveParse } from "../parse/string/string.ts"
import type { ScopeRoot } from "../scope.ts"
import { nodeToType } from "../type.ts"
import type { Domain } from "../utils/domains.ts"
import { throwInternalError, throwParseError } from "../utils/errors.ts"
import { deepFreeze } from "../utils/freeze.ts"
import type { defined } from "../utils/generics.ts"
import { isKeyOf, keysOf } from "../utils/generics.ts"
import { getFlatKeywords, keywords } from "./keywords.ts"
import type {
    MorphNode,
    TraversalNode,
    TypeNode,
    TypeResolution,
    ValidatorNode
} from "./node.ts"
import { compileNode } from "./node.ts"
import type { Literal, Predicate } from "./predicate.ts"

export const resolveIfIdentifier = (
    node: TypeNode,
    $: ScopeRoot
): TypeResolution =>
    typeof node === "string" ? (resolve(node, $) as TypeResolution) : node

export const nodeIsMorph = (node: TypeResolution): node is MorphNode =>
    (node as MorphNode).morph !== undefined

export const nodeIsValidator = (node: TypeResolution): node is ValidatorNode =>
    !nodeIsMorph(node)

export const resolveInput = (node: TypeNode, $: ScopeRoot): ValidatorNode => {
    const root = resolveIfIdentifier(node, $)
    return nodeIsMorph(root) ? resolveInput(root.input, $) : root
}

export const isExactValue = <domain extends Domain>(
    node: TypeNode,
    domain: domain,
    $: ScopeRoot
): node is { [_ in domain]: Literal<domain> } => {
    const resolution = resolveInput(node, $)
    return (
        nodeExtendsDomain(resolution, domain, $) &&
        isExactValuePredicate(resolution[domain])
    )
}

export const isExactValuePredicate = (
    predicate: Predicate
): predicate is Literal => typeof predicate === "object" && "value" in predicate

export const domainsOfNode = (node: TypeNode, $: ScopeRoot): Domain[] =>
    keysOf(resolveInput(node, $))

export type DomainSubtypeNode<domain extends Domain> = {
    readonly [k in domain]: defined<ValidatorNode[domain]>
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
    return isKeyOf(name, keywords) || $.aliases[name] ? true : false
}

export const resolve = (name: string, $: ScopeRoot) => {
    return resolveRecurse(name, [], $)
}

export const resolveFlat = (name: string, $: ScopeRoot): TraversalNode => {
    if (isKeyOf(name, keywords)) {
        return getFlatKeywords()[name]
    }
    resolveRecurse(name, [], $)
    return $.cache.types[name].flat
}

// TODO: change return to Type?
const resolveRecurse = (
    name: string,
    seen: string[],
    $: ScopeRoot
): TypeResolution => {
    if (isKeyOf(name, keywords)) {
        return keywords[name]
    }
    if (isKeyOf(name, $.cache.types)) {
        return $.cache.types[name].node
    }
    if (!$.aliases[name]) {
        return throwInternalError(
            `Unexpectedly failed to resolve alias '${name}'`
        )
    }
    let root = parseDefinition($.aliases[name], $)
    if (typeof root === "string") {
        if (seen.includes(root)) {
            return throwParseError(writeShallowCycleErrorMessage(name, seen))
        }
        seen.push(root)
        root = resolveRecurse(root, seen, $)
    }
    // temporarily set the TraversalNode to an alias that will be used for cyclic resolutions
    const type = nodeToType(root, [["alias", name]], $, {})
    $.cache.types[name] = type
    type.flat = compileNode(root, $)
    return root as TypeResolution
}

export const memoizedParse = (def: string, $: ScopeRoot): TypeNode => {
    if (def in $.cache) {
        return $.cache.nodes[def]
    }
    const root = maybeNaiveParse(def, $) ?? fullStringParse(def, $)
    $.cache.nodes[def] = deepFreeze(root)
    return root
}

export const writeShallowCycleErrorMessage = (name: string, seen: string[]) =>
    `Alias '${name}' has a shallow resolution cycle: ${[...seen, name].join(
        "=>"
    )}`
