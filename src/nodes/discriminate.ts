import type {
    ResolvedCondition,
    TraversalPredicate
} from "../nodes/predicate.ts"
import { conditionIntersection } from "../nodes/predicate.ts"
import type { ScopeRoot } from "../scope.ts"
import type { List } from "../utils/generics.ts"
import { keyCount, keysOf } from "../utils/generics.ts"
import { stringSerialize } from "../utils/serialize.ts"
import type { DisjointKind, DisjointsByPath } from "./compose.ts"
import { initializeIntersectionContext } from "./node.ts"

export type DiscriminatedBranches<kind extends DisjointKind = DisjointKind> = {
    readonly path: string
    readonly kind: kind
    readonly cases: DiscriminatedCases<kind>
}

export type DiscriminatedCases<kind extends DisjointKind = DisjointKind> = {
    [caseKey in string | kind]?: TraversalPredicate
}

export const discriminate = (
    branches: List<ResolvedCondition>,
    $: ScopeRoot
): DiscriminatedBranches => {
    const disjoints = getPairedDisjoints(branches, $)
    const entries = discriminateRecurse(
        branches,
        branches.map((_, i) => i),
        disjoints
    )

    return entries as any
}

const discriminateRecurse = (
    originalBranches: List<ResolvedCondition>,
    remainingIndices: number[],
    disjoints: PairedDisjoints
) => {
    if (remainingIndices.length === 1) {
        return originalBranches[remainingIndices[0]]
    }
    const bestDiscriminant = findBestDiscriminant(remainingIndices, disjoints)
    const caseKeys = keysOf(bestDiscriminant)
    if (caseKeys.length < 2) {
        return remainingIndices.map((i) => originalBranches[i])
    }
    const discriminated = {} as any
    for (const k of caseKeys) {
        discriminated[k] = discriminateRecurse(
            originalBranches,
            bestDiscriminant[k],
            disjoints
        )
    }
    return discriminated
}

type Discriminants = { [k in DiscriminantKey]?: Discriminant }

type IndicesWithValue = number[]

type Discriminant = { [caseKey in string]: IndicesWithValue }

export type DiscriminantKey = DisjointKind | `${string}/${DisjointKind}`

type PairedDisjoints = Record<number, Record<number, DisjointsByPath>>

const getPairedDisjoints = (
    branches: List<ResolvedCondition>,
    $: ScopeRoot
): PairedDisjoints => {
    const disjoints: PairedDisjoints = {}
    for (let lIndex = 0; lIndex < branches.length - 1; lIndex++) {
        disjoints[lIndex] = {}
        for (let rIndex = lIndex + 1; rIndex < branches.length; rIndex++) {
            const context = initializeIntersectionContext($)
            conditionIntersection(branches[lIndex], branches[rIndex], context)
            disjoints[lIndex][rIndex] = context.disjoints
        }
    }
    return disjoints
}

const findBestDiscriminant = (
    indices: number[],
    disjoints: PairedDisjoints
): Discriminant => {
    let bestKey: DiscriminantKey | undefined
    let bestCaseCount = 0
    const discriminants: Discriminants = {}
    for (let i = 0; i < indices.length - 1; i++) {
        const lIndex = indices[i]
        for (let j = i + 1; j < indices.length; j++) {
            const rIndex = indices[j]
            const disjointsByPath = disjoints[lIndex][rIndex]
            for (const path in disjointsByPath) {
                const disjoint = disjointsByPath[path]
                const key: DiscriminantKey = path
                    ? `${path}/${disjoint.kind}`
                    : disjoint.kind
                discriminants[key] ??= {}
                const discriminant = discriminants[key]!
                const lCaseKey = stringSerialize(disjoint.operands[0])
                const rCaseKey = stringSerialize(disjoint.operands[1])
                if (!discriminant[lCaseKey]) {
                    discriminant[lCaseKey] = [lIndex]
                } else if (!discriminant[lCaseKey].includes(lIndex)) {
                    discriminant[lCaseKey].push(lIndex)
                }
                if (!discriminant[rCaseKey]) {
                    discriminant[rCaseKey] = [rIndex]
                } else if (!discriminant[rCaseKey].includes(rIndex)) {
                    discriminant[rCaseKey].push(rIndex)
                }
                const caseCount = keyCount(discriminant)
                if (caseCount > bestCaseCount) {
                    bestKey = key
                    bestCaseCount = caseCount
                }
            }
        }
    }
    return discriminants[bestKey!]!
}

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
