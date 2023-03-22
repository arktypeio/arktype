import type { Type } from "../scopes/type.ts"
import type { Domain, inferDomain } from "../utils/domains.ts"
import { domainDescriptions } from "../utils/domains.ts"
import { throwInternalError } from "../utils/errors.ts"
import type { Dict, mutable } from "../utils/generics.ts"
import { hasKey, keysOf } from "../utils/generics.ts"
import type { Compilation } from "./compile.ts"
import type { IntersectionResult, IntersectionState } from "./compose.ts"
import { BaseNode } from "./compose.ts"
import { mappedKeys } from "./rules/props.ts"
import type { BranchNode, LiteralRules } from "./rules/rules.ts"

export type BranchesComparison = {
    lStrictSubtypeIndices: number[]
    rStrictSubtypeIndices: number[]
    equalIndexPairs: [lIndex: number, rIndex: number][]
    intersections: BranchNode[]
}

export class TypeNode extends BaseNode {
    constructor(public branches: BranchNode[]) {
        super()
    }

    compile(c: Compilation): string {
        return ""
    }

    intersect(node: this, state: IntersectionState): IntersectionResult<this> {
        // state.domain = domain
        const comparison = this.compare(node, state)
        const resultBranches = [
            ...comparison.intersections,
            ...comparison.equalIndexPairs.map(
                (indices) => this.branches[indices[0]]
            ),
            ...comparison.subtypeIndices.map((lIndex) => this.branches[lIndex]),
            ...comparison.supertypeIndices.map(
                (rIndex) => node.branches[rIndex]
            )
        ]
        if (resultBranches.length === 0) {
            return state.addDisjoint("union", this.branches, node.branches)
        }
        return {
            result: new TypeNode([]) as this,
            isSubtype:
                comparison.subtypeIndices.length +
                    comparison.equalIndexPairs.length ===
                node.branches.length,
            isSupertype:
                comparison.supertypeIndices.length +
                    comparison.equalIndexPairs.length ===
                this.branches.length,
            isDisjoint: false
        }
    }

    // union(node: this, s: IntersectionState) {
    //     const state = new IntersectionState(type, "|")
    //     const comparison = this.compare(node, state)
    //     if (!isBranchComparison(comparison)) {
    //         // return isEquality(comparison) || comparison === l
    //         //     ? r
    //         //     : comparison === r
    //         //     ? l
    //         //     : // if a boolean has multiple branches, neither of which is a
    //         //     // subtype of the other, it consists of two opposite literals
    //         //     // and can be simplified to a non-literal boolean.
    //         //     domain === "boolean"
    //         //     ? true
    //         //     : ([emptyRulesIfTrue(l), emptyRulesIfTrue(r)] as [
    //         //           Branch,
    //         //           Branch
    //         //       ])
    //     }
    //     const resultBranches = [
    //         ...this.json.filter(
    //             (_, lIndex) =>
    //                 !comparison.subtypes.includes(lIndex) &&
    //                 !comparison.equalities.some(
    //                     (indexPair) => indexPair[0] === lIndex
    //                 )
    //         ),
    //         ...node.json.filter(
    //             (_, rIndex) =>
    //                 !comparison.supertypes.includes(rIndex) &&
    //                 !comparison.equalities.some(
    //                     (indexPair) => indexPair[1] === rIndex
    //                 )
    //         )
    //     ]
    //     return resultBranches.length === 1 ? resultBranches[0] : resultBranches
    // }

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

    compare(node: this, state: IntersectionState) {
        const comparison: BranchesComparison = {
            lStrictSubtypeIndices: [],
            rStrictSubtypeIndices: [],
            equalIndexPairs: [],
            intersections: []
        }
        const rSubtypeIndices: Record<number, true> = {}
        for (let lIndex = 0; lIndex < this.branches.length; lIndex++) {
            const intersectionsOfL: BranchNode[] = []
            for (let rIndex = 0; rIndex < node.branches.length; rIndex++) {
                if (rSubtypeIndices[rIndex]) {
                    continue
                }
                const intersection = this.branches[lIndex].intersect(
                    node.branches[rIndex],
                    state
                )
                if (intersection.isDisjoint) {
                    continue
                }
                if (intersection.isSubtype) {
                    if (intersection.isSupertype) {
                        rSubtypeIndices[rIndex] = true
                        comparison.equalIndexPairs.push([lIndex, rIndex])
                    } else {
                        comparison.lStrictSubtypeIndices.push(lIndex)
                    }
                    intersectionsOfL.length = 0
                    break
                }
                if (intersection.isSupertype) {
                    rSubtypeIndices[rIndex] = true
                    comparison.rStrictSubtypeIndices.push(rIndex)
                } else {
                    intersectionsOfL.push(intersection.result)
                }
            }
            comparison.intersections.push(...intersectionsOfL)
        }
        return comparison
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
