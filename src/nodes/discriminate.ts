import type { Condition, TraversalPredicate } from "../nodes/predicate.ts"
import { conditionIntersection } from "../nodes/predicate.ts"
import type { ScopeRoot } from "../scope.ts"
import type { Domain, inferDomain, Subdomain } from "../utils/domains.ts"
import { domainOf } from "../utils/domains.ts"
import type { keySet, List } from "../utils/generics.ts"
import { isKeyOf } from "../utils/generics.ts"
import type { Path } from "../utils/paths.ts"
import { popKey, pushKey } from "../utils/paths.ts"
import type { DisjointContext, DisjointKind } from "./compose.ts"
import { initializeIntersectionContext } from "./node.ts"
import { isExactValuePredicate } from "./resolve.ts"
import type { TraversalRuleEntry } from "./rules/rules.ts"
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
        [caseKey in string]?: TraversalPredicate
    }

export type EntryCases<kind extends DiscriminantKind = DiscriminantKind> = [
    condition: DiscriminantKinds[kind],
    then: TraversalPredicate
][]

export type TraversalBranches =
    | [TraversalBranchesEntry]
    | [TraversalSwitchEntry]

export type TraversalBranchesEntry = ["branches", List<TraversalRuleEntry>]

export type TraversalSwitchEntry = ["switch", DiscriminatedSwitch]

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
): List<TraversalRuleEntry> =>
    isExactValuePredicate(condition)
        ? [["value", { value: condition.value }]]
        : compileRules(condition, $)

const discriminateRecurse = (
    originalBranches: List<Condition>,
    remainingIndices: number[],
    discriminants: Discriminants,
    $: ScopeRoot
): TraversalPredicate => {
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
                remainingIndices.flatMap((i) =>
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

const discriminantKinds: keySet<DiscriminantKind> = {
    domain: true,
    subdomain: true,
    tupleLength: true,
    value: true
}

const serializers = {
    boolean: (data) => `${data}`,
    bigint: (data) => `${data}n`,
    number: (data) => `${data}`,
    string: (data) => `'${data}'`,
    undefined: () => "undefined",
    null: () => "null"
} satisfies { [domain in Domain]?: (data: inferDomain<domain>) => string }

const serialize = (data: unknown) => {
    const domain = domainOf(data)
    return isKeyOf(domain, serializers)
        ? serializers[domain](data as never)
        : undefined
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

const addToCases = (
    cases: IndexCases,
    disjoint: DisjointContext,
    lIndex: number,
    rIndex: number
) => {
    if (Array.isArray(cases)) {
        return addEntryIndexCases(cases, disjoint, lIndex, rIndex)
    }
    const [l, r] = disjoint.operands
    const lSerialized = serialize(l)
    const rSerialized = serialize(r)
    if (lSerialized === undefined || rSerialized === undefined) {
        // TODO: add deserialize
        return addEntryIndexCases([], disjoint, lIndex, rIndex)
    }
    if (!cases[lSerialized]) {
        cases[lSerialized] = [lIndex]
    } else if (!cases[lSerialized].includes(lIndex)) {
        cases[lSerialized].push(lIndex)
    }
    if (!cases[rSerialized]) {
        cases[rSerialized] = [rIndex]
    } else if (!cases[rSerialized].includes(rIndex)) {
        cases[rSerialized].push(rIndex)
    }
    return cases
}

const addEntryIndexCases = (
    cases: EntryIndexCases,
    disjoint: DisjointContext,
    lIndex: number,
    rIndex: number
) => {
    let lIncluded = false
    let rIncluded = false
    for (const [condition, indices] of cases) {
        if (disjoint.operands[0] === condition) {
            indices.push(lIndex)
            lIncluded = true
        }
        if (disjoint.operands[1] === condition) {
            indices.push(rIndex)
            rIncluded = true
        }
    }
    if (!lIncluded) {
        cases.push([disjoint.operands[0] as never, [lIndex]])
    }
    if (!rIncluded) {
        cases.push([disjoint.operands[0] as never, [lIndex]])
    }
    return cases
}
