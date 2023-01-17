import type {
    Predicate,
    TraversalCondition,
    TraversalPredicate
} from "../nodes/predicate.ts"
import type { Domain, Subdomain } from "../utils/domains.ts"
import type {
    MorphTraversalNode,
    TraversalNode,
    ValidatorTraversalNode
} from "./node.ts"
import type { TraversalRequiredProps } from "./rules/props.ts"

export type DiscriminatedBranches<
    rule extends DiscriminatableRule = DiscriminatableRule
> = {
    readonly path: string[]
    readonly rule: rule
    readonly cases: TraversalCases<rule>
}

export type TraversalCases<
    ruleName extends DiscriminatableRule = DiscriminatableRule
> = {
    [caseKey in DiscriminatableRules[ruleName]]?: TraversalPredicate
}

type DiscriminatableRules = {
    domain: Domain
    subdomain: Subdomain
    value: string
}

export type DiscriminatableRule = keyof DiscriminatableRules

// const discriminateBranches = (branches: TraversalCondition[]): Predicate => {
//     const discriminant = greedyDiscriminant([], branches)
//     if (!discriminant) {
//         return branches
//     }

//     const cases: record<Type> = {}
//     for (const value in cases) {
//         cases[value] = discriminate(base, $)
//     }
//     return ["?", discriminant.path, cases]
// }

// const greedyDiscriminant = (
//     path: string[],
//     branches: TraversalCondition[]
// ): ScoredDiscriminant | undefined =>
//     greedyShallowDiscriminant(path, branches) ??
//     greedyPropsDiscriminant(path, branches)

// const greedyShallowDiscriminant = (
//     path: string[],
//     branches: TraversalCondition[]
// ): ScoredDiscriminan | undefined => {
//     const typeScore = disjointScore(branches, "type")
//     const valueScore = disjointScore(branches, "value")
//     if (typeScore || valueScore) {
//         return typeScore > valueScore
//             ? { path, rule: "domain", score: typeScore }
//             : {
//                   path,
//                   rule: "domain",
//                   score: valueScore
//               }
//     }
// }

// const greedyPropsDiscriminant = (
//     path: string[],
//     branches: TraversalCondition[]
// ) => {
//     let bestDiscriminant: ScoredDiscriminant | undefined
//     const sortedPropFrequencies = sortPropsByFrequency(branches)
//     for (const [propKey, branchAppearances] of sortedPropFrequencies) {
//         const maxScore = maxEdges(branchAppearances)
//         if (bestDiscriminant && bestDiscriminant.score >= maxScore) {
//             return bestDiscriminant
//         }
//         const propDiscriminant = greedyDiscriminant(
//             [...path, propKey],
//             branches.map((branch) => branch.props?.[propKey] ?? {})
//         )
//         if (
//             propDiscriminant &&
//             (!bestDiscriminant ||
//                 propDiscriminant.score > bestDiscriminant.score)
//         ) {
//             bestDiscriminant = propDiscriminant
//         }
//     }
//     return bestDiscriminant
// }

// const maxEdges = (vertexCount: number) => (vertexCount * (vertexCount - 1)) / 2

// type PropFrequencyEntry = [propKey: string, appearances: number]

// const sortPropsByFrequency = (
//     propBranches: TraversalRequiredProps[]
// ): PropFrequencyEntry[] => {
//     const appearancesByProp: Record<string, number> = {}
//     for (let i = 0; i < propBranches.length; i++) {
//         for (const [propKey] of propBranches[i][1]) {
//             appearancesByProp[propKey] = appearancesByProp[propKey]
//                 ? appearancesByProp[propKey] + 1
//                 : 1
//         }
//     }
//     return Object.entries(appearancesByProp).sort((a, b) => b[1] - a[1])
// }

// type ScoredDiscriminant = DiscriminatedBranches & { score: number }

// // const disjoin = (nodes: TraversalNode[], path: string[], rule: DiscriminatableRule) => {
// //     const discriminant: ScoredDiscriminant = {
// //         path,
// //         rule,
// //         score: 0,
// //         cases: {}
// //     }
// //     for (let i = 0; i < branches.length; i++) {
// //         const value = queryPath(branches[i], discriminant.path)
// //         const caseKey = value ?? "default"
// //         discriminant[caseKey] ??= []
// //         discriminant[caseKey].push(
// //             value
// //                 ? excludeDiscriminant(branches[i], discriminant.path, value)
// //                 : branches[i]
// //         )
// //     }
// //     for (let i = 0; i < nodes.length; i++) {
// //         for (let j = i + 1; j < nodes.length; j++) {
// //             if (
// //                 nodes[i][rule] &&
// //                 nodes[j][rule] &&
// //                 nodes[i][rule] !== nodes[j][rule]
// //             ) {
// //                 score++
// //             }
// //         }
// //     }
// //     return score
// // }

// const domainsOfTraversalNode = (node: TraversalNode) => {
//     if (typeof node === "string") {
//         return [node]
//     }
//     switch (node[0][0]) {
//         case "domain":
//             return node[0][1]
//         case "domains":
//             return "bar"
//     }
// }

// // export const queryPath = (root: TypeResolution, path: string[]) => {
// //     let node = root
// //     for (const segment of path) {
// //         if (node.props?.[segment] === undefined) {
// //             return undefined
// //         }
// //         node = node.props[segment]
// //     }
// //     return node[key]
// // }
