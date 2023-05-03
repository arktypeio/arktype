import type { Domain } from "../utils/domains.js"
import { throwInternalError } from "../utils/errors.js"
import type { evaluate } from "../utils/generics.js"
import type { keySet } from "../utils/records.js"
import { hasKey, isKeyOf, keysOf } from "../utils/records.js"
import type { SerializedPrimitive } from "../utils/serialize.js"
import type { BasisNode } from "./basis.js"
import type { QualifiedDisjoint } from "./disjoint.js"
import { Disjoint, parseQualifiedDisjoint } from "./disjoint.js"
import type { PredicateNode } from "./predicate.js"
import { type CompiledPath } from "./utils.js"

export type CaseKey<kind extends DiscriminantKind = DiscriminantKind> =
    DiscriminantKind extends kind ? string : DiscriminantKinds[kind] | "default"

type IndexCases = {
    [caseKey in CaseKey]?: number[]
}

export type DiscriminatedBranches = PredicateNode[] | DiscriminatedSwitch

export type DiscriminatedSwitch<
    kind extends DiscriminantKind = DiscriminantKind
> = {
    readonly path: CompiledPath
    readonly kind: kind
    readonly cases: DiscriminatedCases<kind>
}

export type DiscriminatedCases<
    kind extends DiscriminantKind = DiscriminantKind
> = {
    [caseKey in CaseKey<kind>]: PredicateNode[] | DiscriminatedSwitch
}

export type QualifiedDiscriminant<
    kind extends DiscriminantKind = DiscriminantKind
> = `${CompiledPath}:${kind}`

export const discriminate = (branches: PredicateNode[]) => {
    if (branches.length === 0 || branches.length === 1) {
        return branches
    }
    const discriminants = calculateDiscriminants(branches)
    const indices = branches.map((_, i) => i)
    return discriminateRecurse(branches, indices, discriminants)
}

const discriminateRecurse = (
    originalBranches: readonly PredicateNode[],
    remainingIndices: number[],
    discriminants: Discriminants
): DiscriminatedBranches => {
    if (remainingIndices.length === 1) {
        return [originalBranches[remainingIndices[0]]]
    }
    const bestDiscriminant = findBestDiscriminant(
        remainingIndices,
        discriminants
    )
    if (!bestDiscriminant) {
        // branchIncludesMorph(originalBranches[i], ctx.type.scope)
        // ? throwParseError(
        //       writeUndiscriminatableMorphUnionMessage(`${ctx.path}`)
        //   )
        // : compileBranch(originalBranches[i], ctx)
        return remainingIndices.map((i) => originalBranches[i])
    }
    const cases = {} as DiscriminatedCases
    for (const caseKey in bestDiscriminant.indexCases) {
        const nextIndices = bestDiscriminant.indexCases[caseKey]!
        cases[caseKey] = discriminateRecurse(
            originalBranches,
            nextIndices,
            discriminants
        )
        // if (caseKey !== "default") {
        //     pruneDiscriminant(
        //         cases[caseKey]!,
        //         bestDiscriminant.path,
        //         bestDiscriminant
        //     )
        // }
    }
    if (!hasKey(cases, "default")) {
        // TODO: Create error from union
        cases.default = []
    }
    return {
        path: bestDiscriminant.path,
        kind: bestDiscriminant.kind,
        cases
    }
}

type Discriminants = {
    disjointsByPair: DisjointsByPair
    casesByDisjoint: CasesByDiscriminant
}

type DisjointsByPair = Record<`${number},${number}`, QualifiedDiscriminant[]>

type CasesByDiscriminant = {
    [k in QualifiedDiscriminant]?: IndexCases
}

export type DiscriminantKinds = {
    domain: Domain
    value: SerializedPrimitive
}

const discriminantKinds: keySet<DiscriminantKind> = {
    domain: true,
    value: true
}

export type DiscriminantKind = evaluate<keyof DiscriminantKinds>

const calculateDiscriminants = (
    branches: readonly PredicateNode[]
): Discriminants => {
    const discriminants: Discriminants = {
        disjointsByPair: {},
        casesByDisjoint: {}
    }
    for (let lIndex = 0; lIndex < branches.length - 1; lIndex++) {
        for (let rIndex = lIndex + 1; rIndex < branches.length; rIndex++) {
            const pairKey = `${lIndex},${rIndex}` as const
            discriminants.disjointsByPair[pairKey] = []
            const pairDisjoints = discriminants.disjointsByPair[pairKey]
            const result = branches[lIndex].intersect(branches[rIndex])
            if (!(result instanceof Disjoint)) {
                continue
            }
            let path: QualifiedDisjoint
            for (path in result.sources) {
                const kind = parseQualifiedDisjoint(path)[1]
                const disjointAtPath = result.sources[path]!
                if (!isKeyOf(kind, discriminantKinds)) {
                    continue
                }
                const qualifiedDiscriminant = path as QualifiedDiscriminant
                let lSerialized: string
                let rSerialized: string
                if (kind === "domain") {
                    lSerialized = (disjointAtPath.l as BasisNode).domain
                    rSerialized = (disjointAtPath.r as BasisNode).domain
                } else if (kind === "value") {
                    lSerialized = (disjointAtPath.l as BasisNode<"value">)
                        .serializedValue
                    rSerialized = (disjointAtPath.r as BasisNode<"value">)
                        .serializedValue
                } else {
                    return throwInternalError(
                        `Unexpected attempt to discriminate disjoint kind '${kind}'`
                    )
                }
                pairDisjoints.push(qualifiedDiscriminant)
                if (!discriminants.casesByDisjoint[qualifiedDiscriminant]) {
                    discriminants.casesByDisjoint[qualifiedDiscriminant] = {
                        [lSerialized]: [lIndex],
                        [rSerialized]: [rIndex]
                    }
                    continue
                }
                const cases =
                    discriminants.casesByDisjoint[qualifiedDiscriminant]!
                if (!hasKey(cases, lSerialized)) {
                    cases[lSerialized] = [lIndex]
                } else if (!cases[lSerialized].includes(lIndex)) {
                    cases[lSerialized].push(lIndex)
                }
                if (!hasKey(cases, rSerialized)) {
                    cases[rSerialized] = [rIndex]
                } else if (!cases[rSerialized].includes(rIndex)) {
                    cases[rSerialized].push(rIndex)
                }
            }
        }
    }
    return discriminants
}

type Discriminant = {
    path: CompiledPath
    kind: DiscriminantKind
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
                discriminants.disjointsByPair[`${lIndex},${rIndex}`]
            for (const qualifiedDisjoint of candidates) {
                const indexCases =
                    discriminants.casesByDisjoint[qualifiedDisjoint]!
                const filteredCases: IndexCases = {}
                const defaultCases: Record<number, number> = [
                    ...remainingIndices
                ]
                let score = 0
                for (const caseKey in indexCases) {
                    const filteredIndices = indexCases[caseKey]!.filter((i) => {
                        const remainingIndex = remainingIndices.indexOf(i)
                        if (remainingIndex !== -1) {
                            delete defaultCases[remainingIndex]
                            return true
                        }
                    })
                    if (filteredIndices.length === 0) {
                        continue
                    }
                    filteredCases[caseKey] = filteredIndices
                    score++
                }
                const defaultCaseKeys = keysOf(defaultCases)
                if (defaultCaseKeys.length) {
                    filteredCases["default"] = defaultCaseKeys.map((k) =>
                        parseInt(k)
                    )
                }
                if (!bestDiscriminant || score > bestDiscriminant.score) {
                    const [path, kind] =
                        parseQualifiedDisjoint(qualifiedDisjoint)
                    bestDiscriminant = {
                        path,
                        kind,
                        indexCases: filteredCases,
                        score
                    }
                    if (score === remainingIndices.length) {
                        // if we find a candidate that discriminates all branches, return early
                        return bestDiscriminant
                    }
                }
            }
        }
    }
    return bestDiscriminant
}

export const writeUndiscriminatableMorphUnionMessage = <path extends string>(
    path: path
) =>
    `${
        path === "/" ? "A" : `At ${path}, a`
    } union including one or more morphs must be discriminatable`
