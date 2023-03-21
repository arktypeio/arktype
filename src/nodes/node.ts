import type { Type, TypeConfig } from "../scopes/type.ts"
import type { Domain, inferDomain } from "../utils/domains.ts"
import { throwInternalError } from "../utils/errors.ts"
import type { defined, Dict, mutable, stringKeyOf } from "../utils/generics.ts"
import { hasKey, keysOf } from "../utils/generics.ts"
import { KeyedNode, undefinedOperandsMessage } from "./compose.ts"
import type { DomainNode, Predicate } from "./predicate.ts"
import { isLiteralCondition, predicateUnion } from "./predicate.ts"
import { mappedKeys } from "./rules/props.ts"
import type { LiteralRules } from "./rules/rules.ts"

export type TypeJson<$ = Dict> = DomainsNode<$> | ConfigNode<$>

export class TypeNode extends KeyedNode<TypeNodeDefinition> {
    readonly onEmpty = "omit"

    union(node: this, type: Type) {
        const result = {} as mutable<DomainsNode>
        const domains = keysOf({ ...this.json, ...node.json })
        for (const domain of domains) {
            result[domain] = hasKey(this.json, domain)
                ? hasKey(node.json, domain)
                    ? predicateUnion(
                          domain,
                          this.json[domain],
                          node.json[domain],
                          type
                      )
                    : this.json[domain]
                : hasKey(node.json[domain], domain)
                ? node.json[domain]
                : throwInternalError(undefinedOperandsMessage)
        }
        return result
    }

    toArray() {
        return {
            object: {
                instance: Array,
                props: {
                    [mappedKeys.index]: this
                }
            }
        }
    }

    // if (l === undefined) {
    //     return r === undefined
    //         ? throwInternalError(undefinedOperandsMessage)
    //         : undefined
    // }
    // if (r === undefined) {
    //     return undefined
    // }
    // return predicateIntersection(domain, l, r, context)

    // if (typeof result === "object" && !hasKeys(result)) {
    //     return hasKeys(state.disjoints)
    //         ? anonymousDisjoint()
    //         : state.addDisjoint("domain", keysOf(lDomains), keysOf(rDomains))
    // }
    // return result === lDomains ? l : result === rDomains ? r : result

    // const state = new IntersectionState(type, "&")
    // const result = nodeIntersection(l, r, state)
    // return isDisjoint(result)
    //     ? throwParseError(compileDisjointReasonsMessage(state.disjoints))
    //     : isEquality(result)
    //     ? l
    //     : result
}

export type TypeNodeDefinition = {
    readonly [domain in Domain]?: DomainNode<domain>
}

export type ConfigNode<$ = Dict> = {
    config: TypeConfig
    node: DomainsNode<$>
}

export const isConfigNode = (node: ResolvedNode): node is ConfigNode =>
    "config" in node

export type DomainsNode<$ = Dict> = {
    readonly [domain in Domain]?: Predicate<domain, $>
}

export type LiteralNode<
    domain extends Domain = Domain,
    value extends inferDomain<domain> = inferDomain<domain>
> = {
    [k in domain]: LiteralRules<domain, value>
}

export const isLiteralNode = <domain extends Domain>(
    node: ResolvedNode,
    domain: domain
): node is LiteralNode<domain> => {
    return (
        resolutionExtendsDomain(node, domain) &&
        isLiteralCondition(node[domain])
    )
}

export type DomainSubtypeResolution<domain extends Domain> = {
    readonly [k in domain]: defined<DomainsNode[domain]>
}

export const resolutionExtendsDomain = <domain extends Domain>(
    resolution: ResolvedNode,
    domain: domain
): resolution is DomainSubtypeResolution<domain> => {
    const domains = keysOf(resolution)
    return domains.length === 1 && domains[0] === domain
}
