import type { Type } from "../scopes/type.ts"
import type { Domain, inferDomain } from "../utils/domains.ts"
import { domainDescriptions } from "../utils/domains.ts"
import { throwInternalError } from "../utils/errors.ts"
import type { Dict, mutable } from "../utils/generics.ts"
import { hasKey, keysOf } from "../utils/generics.ts"
import type { Compilation } from "./compile.ts"
import type { IntersectionResult, IntersectionState } from "./compose.ts"
import { BaseNode } from "./compose.ts"
import type { DomainNode, Predicate } from "./predicate.ts"
import { predicateUnion } from "./predicate.ts"
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

    compile(c: Compilation): string {
        return ""
    }

    intersect(node: this, s: IntersectionState): IntersectionResult<this> {
        const result: mutable<TypeDomains> = {}
        let isSubtype = true
        let isSupertype = true
        let isDisjoint = true
        let domain: Domain
        for (domain of domainKeys) {
            if (hasKey(this.domains, domain)) {
                if (hasKey(node.domains, domain)) {
                    const domainIntersection = this.domains[
                        domain
                    ].intersection(node.domains[domain], s)
                    if (domainIntersection.isDisjoint) {
                        isSubtype = false
                        isSupertype = false
                        continue
                    }
                    result[domain] = domainIntersection.result
                    isSubtype &&= domainIntersection.isSubtype
                    isSupertype &&= domainIntersection.isSupertype
                    isDisjoint = false
                }
            }
        }
        if (isDisjoint) {
            return s.addDisjoint(
                "domain",
                keysOf(this.domains),
                keysOf(node.domains)
            )
        }
        return {
            isSubtype,
            isSupertype,
            isDisjoint,
            result: isSupertype
                ? this
                : isSubtype
                ? node
                : (new TypeNode(result) as this)
        }
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
