import type {
    ResolvedCondition,
    TraversalPredicate
} from "../nodes/predicate.ts"
import { conditionIntersection } from "../nodes/predicate.ts"
import type { ScopeRoot } from "../scope.ts"
import type { List } from "../utils/generics.ts"
import { keyCount } from "../utils/generics.ts"
import { popKey } from "../utils/paths.ts"
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
) => {
    const disjoints = getPairedDisjoints(branches, $)
    return discriminateRecurse(
        branches,
        branches.map((_, i) => i),
        disjoints
    )
}

type IndicesByCaseKey = { [caseKey in string]: number[] }

export type DiscriminantKey = DisjointKind | `${string}/${DisjointKind}`

type PairedDisjoints = Record<number, Record<number, DisjointsByPath>>

const discriminateRecurse = (
    originalBranches: List<ResolvedCondition>,
    remainingIndices: number[],
    disjoints: PairedDisjoints
): any => {
    if (remainingIndices.length === 1) {
        return originalBranches[remainingIndices[0]]
    }
    const bestDiscriminant = findBestDiscriminant(remainingIndices, disjoints)
    if (!bestDiscriminant) {
        return remainingIndices.map((i) => originalBranches[i])
    }

    const cases: DiscriminatedCases = {}
    for (const caseKey in bestDiscriminant.indicesByCase) {
        cases[caseKey] = discriminateRecurse(
            originalBranches,
            bestDiscriminant.indicesByCase[caseKey],
            disjoints
        )
    }
    const [path, kind] = popKey(bestDiscriminant.key)
    return {
        path,
        kind,
        cases
    }
}

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

type DiscriminantCandidates = { [k in DiscriminantKey]?: IndicesByCaseKey }

type Discriminant = {
    key: DiscriminantKey
    indicesByCase: IndicesByCaseKey
}

const findBestDiscriminant = (
    indices: number[],
    disjoints: PairedDisjoints
): Discriminant | undefined => {
    let bestKey: DiscriminantKey | undefined
    let bestCaseCount = 0
    const discriminants: DiscriminantCandidates = {}
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
                // TODO: move this, some kinds aren't serializable
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
    if (bestKey !== undefined) {
        return {
            key: bestKey,
            indicesByCase: discriminants[bestKey]!
        }
    }
}
