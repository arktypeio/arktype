import type {
    ResolvedCondition,
    TraversalPredicate
} from "../nodes/predicate.ts"
import { conditionIntersection } from "../nodes/predicate.ts"
import type { ScopeRoot } from "../scope.ts"
import type { List } from "../utils/generics.ts"
import type { Path } from "../utils/paths.ts"
import { popKey, pushKey } from "../utils/paths.ts"
import { stringSerialize } from "../utils/serialize.ts"
import type { DisjointKind } from "./compose.ts"
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
    const discriminants = calculateDiscriminants(branches, $)
    return discriminateRecurse(
        branches,
        branches.map((_, i) => i),
        discriminants
    )
}

type IndicesByCaseKey = { [caseKey in string]: number[] }

export type QualifiedDisjoint = `/${string}${DisjointKind}`

const discriminateRecurse = (
    originalBranches: List<ResolvedCondition>,
    remainingIndices: number[],
    discriminants: Discriminants
): any => {
    if (remainingIndices.length === 1) {
        return originalBranches[remainingIndices[0]]
    }
    const bestDiscriminant = findBestDiscriminant(
        remainingIndices,
        discriminants
    )
    if (!bestDiscriminant) {
        return remainingIndices.map((i) => originalBranches[i])
    }

    const cases: DiscriminatedCases = {}
    for (const caseKey in bestDiscriminant.indexCases) {
        cases[caseKey] = discriminateRecurse(
            originalBranches,
            bestDiscriminant.indexCases[caseKey],
            discriminants
        )
    }
    const [path, kind] = popKey(bestDiscriminant.qualifiedDisjoint)
    return {
        path,
        kind,
        cases
    }
}

type Discriminants = {
    disjointsByPair: DisjointsByPair
    casesByQualifiedDisjoint: CasesByDisjoint
}

type DisjointsByPair = Record<`${number}/${number}`, QualifiedDisjoint[]>

type CasesByDisjoint = { [k in QualifiedDisjoint]: IndicesByCaseKey }

const calculateDiscriminants = (
    branches: List<ResolvedCondition>,
    $: ScopeRoot
): Discriminants => {
    const discriminants: Discriminants = {
        disjointsByPair: {},
        casesByQualifiedDisjoint: {}
    }
    for (let lIndex = 0; lIndex < branches.length - 1; lIndex++) {
        for (let rIndex = lIndex + 1; rIndex < branches.length; rIndex++) {
            const pairKey = `${lIndex}/${rIndex}` as const
            const pairDisjoints: QualifiedDisjoint[] = []
            discriminants.disjointsByPair[pairKey] = pairDisjoints
            const context = initializeIntersectionContext($)
            conditionIntersection(branches[lIndex], branches[rIndex], context)
            let path: Path
            for (path in context.disjoints) {
                const disjointContext = context.disjoints[path]
                const qualifiedDisjoint = pushKey(path, disjointContext.kind)
                discriminants.disjointsByPair[pairKey].push(qualifiedDisjoint)
                discriminants.casesByQualifiedDisjoint[qualifiedDisjoint] ??= {}
                const disjoinedIndices =
                    discriminants.casesByQualifiedDisjoint[qualifiedDisjoint]
                const lCaseKey = stringSerialize(disjointContext.operands[0])
                const rCaseKey = stringSerialize(disjointContext.operands[1])
                if (!disjoinedIndices[lCaseKey]) {
                    disjoinedIndices[lCaseKey] = [lIndex]
                } else if (!disjoinedIndices[lCaseKey].includes(lIndex)) {
                    disjoinedIndices[lCaseKey].push(lIndex)
                }
                if (!disjoinedIndices[rCaseKey]) {
                    disjoinedIndices[rCaseKey] = [rIndex]
                } else if (!disjoinedIndices[rCaseKey].includes(rIndex)) {
                    disjoinedIndices[rCaseKey].push(rIndex)
                }
            }
        }
    }
    return discriminants
}

type Discriminant = {
    qualifiedDisjoint: QualifiedDisjoint
    indexCases: IndicesByCaseKey
    score: number
}

const findBestDiscriminant = (
    remainingIndices: number[],
    discriminants: Discriminants
): Discriminant | undefined => {
    let bestDiscriminant: Discriminant | undefined
    for (let i = 0; i < remainingIndices.length - 1; i++) {
        const lIndex = remainingIndices[i]
        for (let j = i + 1; j < remainingIndices.length; j++) {
            const rIndex = remainingIndices[j]
            const candidates =
                discriminants.disjointsByPair[`${lIndex}/${rIndex}`]
            for (const qualifiedDisjoint of candidates) {
                const indexCases =
                    discriminants.casesByQualifiedDisjoint[qualifiedDisjoint]
                const filteredCases: IndicesByCaseKey = {}
                let score = 0
                for (const caseKey in indexCases) {
                    const filteredIndices = indexCases[caseKey].filter((i) =>
                        remainingIndices.includes(i)
                    )
                    if (filteredIndices.length === 0) {
                        continue
                    }
                    filteredCases[caseKey] = filteredIndices
                    score++
                }
                if (!bestDiscriminant || score > bestDiscriminant.score) {
                    bestDiscriminant = {
                        qualifiedDisjoint,
                        indexCases: filteredCases,
                        score
                    }
                }
            }
        }
    }
    return bestDiscriminant
}
