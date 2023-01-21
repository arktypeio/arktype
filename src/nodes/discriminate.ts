import type { Condition } from "../nodes/predicate.ts"
import { conditionIntersection } from "../nodes/predicate.ts"
import type { ScopeRoot } from "../scope.ts"
import type { Domain, Subdomain } from "../utils/domains.ts"
import { domainOf } from "../utils/domains.ts"
import type { keySet, List } from "../utils/generics.ts"
import { isKeyOf } from "../utils/generics.ts"
import type { Path } from "../utils/paths.ts"
import { popKey, pushKey } from "../utils/paths.ts"
import type {
    SerializablePrimitive,
    SerializedPrimitive
} from "../utils/serialize.ts"
import { deserializePrimitive, serializePrimitive } from "../utils/serialize.ts"
import type { DisjointKind } from "./compose.ts"
import type { TraversalEntry } from "./node.ts"
import { initializeIntersectionContext } from "./node.ts"
import { isExactValuePredicate } from "./resolve.ts"
import { compileRules } from "./rules/rules.ts"

export type DiscriminatedSwitch = {
    readonly path: string
    readonly kind: DisjointKind
    readonly cases: DiscriminatedCases
}

export type DiscriminatedCases<
    kind extends DiscriminantKind = DiscriminantKind
> = SerializedCases | CaseEntry<kind>[]

export type SerializedCases = {
    [caseKey in string]?: TraversalEntry[]
}

export type CaseEntry<kind extends DiscriminantKind = DiscriminantKind> = [
    condition: DiscriminantKinds[kind],
    then: TraversalEntry[]
]

export const discriminate = (branches: List<Condition>, $: ScopeRoot) => {
    const discriminants = calculateDiscriminants(branches, $)
    return discriminateRecurse(
        branches,
        branches.map((_, i) => i),
        discriminants,
        $
    )
}

type IndexCases = SerializedIndexCases | EntryIndexCases

type SerializedIndexCases = {
    [caseKey in string]: number[]
}

type EntryIndexCases = [unknown, number[]][]

export type QualifiedDisjoint = `/${string}${DiscriminantKind}`

const compileCondition = (
    condition: Condition,
    $: ScopeRoot
): TraversalEntry[] =>
    isExactValuePredicate(condition)
        ? [["value", { value: condition.value }]]
        : compileRules(condition, $)

const discriminateRecurse = (
    originalBranches: List<Condition>,
    remainingIndices: number[],
    discriminants: Discriminants,
    $: ScopeRoot
): TraversalEntry[] => {
    if (remainingIndices.length === 1) {
        return compileCondition(originalBranches[remainingIndices[0]], $)
    }
    const bestDiscriminant = findBestDiscriminant(
        remainingIndices,
        discriminants
    )
    if (!bestDiscriminant) {
        return [
            [
                "branches",
                remainingIndices.map((i) =>
                    compileCondition(originalBranches[i], $)
                )
            ]
        ]
    }
    let cases
    if (Array.isArray(bestDiscriminant.indexCases)) {
        cases = bestDiscriminant.indexCases.map(
            ([condition, indices]): CaseEntry => [
                condition,
                discriminateRecurse(originalBranches, indices, discriminants, $)
            ]
        )
    } else {
        cases = {} as SerializedCases
        for (const caseKey in bestDiscriminant.indexCases) {
            cases[caseKey] = discriminateRecurse(
                originalBranches,
                bestDiscriminant.indexCases[caseKey],
                discriminants,
                $
            )
        }
    }
    const [path, kind] = popKey(bestDiscriminant.qualifiedDisjoint) as [
        Path,
        DisjointKind
    ]
    return [
        [
            "switch",
            {
                path,
                kind,
                cases
            }
        ]
    ]
}

type Discriminants = {
    disjointsByPair: DisjointsByPair
    serializedCasesByDisjoint: SerializedCasesByDisjoint
    entryCasesByDisjoint: EntryCasesByDisjoint
}

type DisjointsByPair = Record<`${number}/${number}`, QualifiedDisjoint[]>

type SerializedCasesByDisjoint = {
    [k in QualifiedDisjoint]: SerializedIndexCases
}

type EntryCasesByDisjoint = { [k in QualifiedDisjoint]: EntryIndexCases }

export type DiscriminantKinds = {
    domain: Domain
    subdomain: Subdomain
    tupleLength: number
    value: unknown
}

const discriminantKinds: keySet<DiscriminantKind> = {
    domain: true,
    subdomain: true,
    tupleLength: true,
    value: true
}

export type DiscriminantKind = keyof DiscriminantKinds

const calculateDiscriminants = (
    branches: List<Condition>,
    $: ScopeRoot
): Discriminants => {
    const discriminants: Discriminants = {
        disjointsByPair: {},
        serializedCasesByDisjoint: {},
        entryCasesByDisjoint: {}
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
                if (!isKeyOf(disjointContext.kind, discriminantKinds)) {
                    continue
                }
                const qualifiedDisjoint = pushKey(path, disjointContext.kind)
                discriminants.disjointsByPair[pairKey].push(qualifiedDisjoint)
                addCases(discriminants, {
                    qualifiedDisjoint,
                    kind: disjointContext.kind,
                    l: disjointContext.operands[0],
                    r: disjointContext.operands[1],
                    lIndex,
                    rIndex
                })
            }
        }
    }
    return discriminants
}

type Discriminant = {
    qualifiedDisjoint: QualifiedDisjoint
    indexCases: IndexCases
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
                    discriminants.serializedCasesByDisjoint[qualifiedDisjoint]
                const filteredCases: IndexCases = {}
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

type CandidateContext = {
    qualifiedDisjoint: QualifiedDisjoint
    kind: DiscriminantKind
    l: unknown
    r: unknown
    lIndex: number
    rIndex: number
}

const addCases = (
    discriminants: Discriminants,
    candidate: CandidateContext
) => {
    if (
        candidate.qualifiedDisjoint in discriminants.serializedCasesByDisjoint
    ) {
        addSerializedIndexCases(
            discriminants.serializedCasesByDisjoint[
                candidate.qualifiedDisjoint
            ],
            candidate
        )
    } else if (
        candidate.qualifiedDisjoint in discriminants.entryCasesByDisjoint
    ) {
        addEntryIndexCases(
            discriminants.entryCasesByDisjoint[candidate.qualifiedDisjoint],
            candidate
        )
    } else {
        const cases: SerializedIndexCases = {}
        discriminants.serializedCasesByDisjoint[candidate.qualifiedDisjoint] =
            cases
        addSerializedIndexCases(cases, candidate)
    }
}

const addSerializedIndexCases = (
    cases: SerializedIndexCases,
    candidate: CandidateContext
) => {
    const lSerialized = serializeIfAllowed(candidate.l)
    const rSerialized = serializeIfAllowed(candidate.r)
    if (lSerialized === undefined || rSerialized === undefined) {
        const existing: EntryIndexCases = []
        for (const k in cases) {
            existing.push([deserializeDiscriminant(candidate.kind, k), []])
        }
        return addEntryIndexCases(existing, candidate)
    }
    if (!cases[lSerialized]) {
        cases[lSerialized] = [candidate.lIndex]
    } else if (!cases[lSerialized].includes(candidate.lIndex)) {
        cases[lSerialized].push(candidate.lIndex)
    }
    if (!cases[rSerialized]) {
        cases[rSerialized] = [candidate.rIndex]
    } else if (!cases[rSerialized].includes(candidate.rIndex)) {
        cases[rSerialized].push(candidate.rIndex)
    }
}

const addEntryIndexCases = (
    cases: EntryIndexCases,
    discriminant: CandidateContext
) => {
    let lIncluded = false
    let rIncluded = false
    for (const [condition, indices] of cases) {
        if (discriminant.l === condition) {
            indices.push(discriminant.lIndex)
            lIncluded = true
        }
        if (discriminant.r === condition) {
            indices.push(discriminant.rIndex)
            rIncluded = true
        }
    }
    if (!lIncluded) {
        cases.push([discriminant.l, [discriminant.lIndex]])
    }
    if (!rIncluded) {
        cases.push([discriminant.r, [discriminant.rIndex]])
    }
}

const serializeIfAllowed = (data: unknown) => {
    const domain = domainOf(data)
    return domain === "object" || domain === "symbol"
        ? undefined
        : serializePrimitive(data as SerializablePrimitive)
}

const deserializeDiscriminant = (kind: DiscriminantKind, caseKey: string) =>
    kind === "domain" || kind === "subdomain"
        ? (caseKey as Subdomain)
        : deserializePrimitive(caseKey as SerializedPrimitive)
