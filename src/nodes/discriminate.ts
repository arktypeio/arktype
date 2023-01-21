import type { Condition } from "../nodes/predicate.ts"
import { conditionIntersection } from "../nodes/predicate.ts"
import type { ScopeRoot } from "../scope.ts"
import type { Domain, Subdomain } from "../utils/domains.ts"
import { domainOf } from "../utils/domains.ts"
import type { keySet, List, replaceProps } from "../utils/generics.ts"
import { isKeyOf } from "../utils/generics.ts"
import type { NumberLiteral } from "../utils/numericLiterals.ts"
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
> = SerializedCases<kind> | EntryCases<kind>

export type SerializedCases<kind extends DiscriminantKind = DiscriminantKind> =
    {
        [caseKey in SerializedDiscriminants[kind]]?: TraversalEntry[]
    }

export type EntryCases<kind extends DiscriminantKind = DiscriminantKind> = [
    condition: DiscriminantKinds[kind],
    then: TraversalEntry[]
][]

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
    [caseKey in SerializedDiscriminants[DiscriminantKind]]: number[]
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

    const cases: DiscriminatedCases = {}
    for (const caseKey in bestDiscriminant.indexCases) {
        cases[caseKey] = discriminateRecurse(
            originalBranches,
            bestDiscriminant.indexCases[caseKey],
            discriminants,
            $
        )
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
    casesByQualifiedDisjoint: CasesByDisjoint
}

type DisjointsByPair = Record<`${number}/${number}`, QualifiedDisjoint[]>

type CasesByDisjoint = { [k in QualifiedDisjoint]: IndexCases }

export type DiscriminantKinds = {
    domain: Domain
    subdomain: Subdomain
    tupleLength: number
    value: unknown
}

type SerializedDiscriminants = replaceProps<
    DiscriminantKinds,
    {
        tupleLength: NumberLiteral
        value: SerializedPrimitive
    }
>

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
                if (isKeyOf(disjointContext.kind, discriminantKinds)) {
                    continue
                }
                const qualifiedDisjoint = pushKey(path, disjointContext.kind)
                discriminants.disjointsByPair[pairKey].push(qualifiedDisjoint)
                discriminants.casesByQualifiedDisjoint[qualifiedDisjoint] ??= {}
                addToCases(
                    discriminants.casesByQualifiedDisjoint[qualifiedDisjoint],
                    disjointContext,
                    lIndex,
                    rIndex
                )
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
                    discriminants.casesByQualifiedDisjoint[qualifiedDisjoint]
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

type DiscriminantContext = {
    kind: DiscriminantKind
    l: unknown
    r: unknown
    lIndex: number
    rIndex: number
}

const addToCases = (cases: IndexCases, discriminant: DiscriminantContext) => {
    if (Array.isArray(cases)) {
        return addEntryIndexCases(cases, discriminant)
    }
    const lSerialized = serializeIfAllowed(discriminant.l)
    const rSerialized = serializeIfAllowed(discriminant.r)
    if (lSerialized === undefined || rSerialized === undefined) {
        const existing: EntryIndexCases = []
        for (const k in cases) {
            existing.push([deserializeDiscriminant(discriminant.kind, k), []])
        }
        return addEntryIndexCases(existing, discriminant)
    }
    if (!cases[lSerialized]) {
        cases[lSerialized] = [discriminant.lIndex]
    } else if (!cases[lSerialized].includes(discriminant.lIndex)) {
        cases[lSerialized].push(discriminant.lIndex)
    }
    if (!cases[rSerialized]) {
        cases[rSerialized] = [discriminant.rIndex]
    } else if (!cases[rSerialized].includes(discriminant.rIndex)) {
        cases[rSerialized].push(discriminant.rIndex)
    }
    return cases
}

const addEntryIndexCases = (
    cases: EntryIndexCases,
    discriminant: DiscriminantContext
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
    return cases
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
