import type { Type, TypeConfig } from "../scopes/type.ts"
import type { Domain, inferDomain } from "../utils/domains.ts"
import { domainDescriptions } from "../utils/domains.ts"
import { throwInternalError } from "../utils/errors.ts"
import type { Dict, mutable } from "../utils/generics.ts"
import { defined, hasKey, hasKeys, keysOf } from "../utils/generics.ts"
import type { IntersectionResult, IntersectionState } from "./compose.ts"
import { BaseNode, KeyedNode } from "./compose.ts"
import type { DomainNode, Predicate } from "./predicate.ts"
import { isLiteralCondition, predicateUnion } from "./predicate.ts"
import { mappedKeys } from "./rules/props.ts"
import type { LiteralRules } from "./rules/rules.ts"

export type TypeJson<$ = Dict> = {
    readonly [domain in Domain]?: Predicate<domain, $>
} //| ConfigNode<$>

export type TypeDomains = {
    readonly [domain in Domain]?: DomainNode<domain>
}

const domainKeys = keysOf(domainDescriptions)

export class TypeNode extends BaseNode {
    constructor(public domains: TypeDomains) {
        super()
    }

    intersect(node: this, s: IntersectionState) {
        const intersection: IntersectionResult<mutable<TypeDomains>> = {
            result: {},
            isSubtype: true,
            isSupertype: true,
            isDisjoint: false
        }
        let domain: Domain
        for (domain of domainKeys) {
            if (hasKey(this.domains, domain)) {
                if (hasKey(node.domains, domain)) {
                    const domainIntersection = this.domains[
                        domain
                    ].intersection(node.domains[domain], s)
                    if (domainIntersection.isDisjoint) {
                        intersection.isSubtype = false
                        intersection.isSupertype = false
                        continue
                    }
                    intersection.result[domain] = domainIntersection.result
                    intersection.isSubtype &&= domainIntersection.isSubtype
                    intersection.isSupertype &&= domainIntersection.isSupertype
                }
            }
        }
        return hasKeys(intersection.result)
            ? intersection
            : s.addDisjoint(
                  "domain",
                  keysOf(this.domains),
                  keysOf(node.domains)
              )
    }

    union(node: this, type: Type) {
        const result = {} as mutable<DomainsJson>
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

    // const state = new IntersectionState(type, "&")
    // const result = nodeIntersection(l, r, state)
    // return isDisjoint(result)
    //     ? throwParseError(compileDisjointReasonsMessage(state.disjoints))
    //     : isEquality(result)
    //     ? l
    //     : result
}

// export type ConfigNode<$ = Dict> = {
//     config: TypeConfig
//     node: DomainsJson<$>
// }

export type LiteralNode<
    domain extends Domain = Domain,
    value extends inferDomain<domain> = inferDomain<domain>
> = {
    [k in domain]: LiteralRules<domain, value>
}

// export const isLiteralNode = <domain extends Domain>(
//     node: ResolvedNode,
//     domain: domain
// ): node is LiteralNode<domain> => {
//     return (
//         resolutionExtendsDomain(node, domain) &&
//         isLiteralCondition(node[domain])
//     )
// }

// export type DomainSubtypeResolution<domain extends Domain> = {
//     readonly [k in domain]: defined<DomainsNode[domain]>
// }

// export const resolutionExtendsDomain = <domain extends Domain>(
//     resolution: ResolvedNode,
//     domain: domain
// ): resolution is DomainSubtypeResolution<domain> => {
//     const domains = keysOf(resolution)
//     return domains.length === 1 && domains[0] === domain
// }
