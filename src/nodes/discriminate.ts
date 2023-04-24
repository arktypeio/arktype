import type { Domain } from "../utils/domains.js"
import type { evaluate, keySet } from "../utils/generics.js"
import { isKeyOf, keysOf } from "../utils/generics.js"
import type { DefaultObjectKind } from "../utils/objectKinds.js"
import { Path } from "../utils/paths.js"
import type { SerializedPrimitive } from "../utils/serialize.js"
import type { DisjointKind } from "./node.js"
import { DisjointNode } from "./node.js"
import type { PredicateNode } from "./predicate.js"

export type CaseKey<kind extends DiscriminantKind = DiscriminantKind> =
    DiscriminantKind extends kind ? string : DiscriminantKinds[kind] | "default"

type IndexCases = {
    [caseKey in CaseKey]?: number[]
}

export type DiscriminatedBranches = PredicateNode[] | DiscriminatedSwitch

export type DiscriminatedSwitch<
    kind extends DiscriminantKind = DiscriminantKind
> = {
    readonly path: Path
    readonly kind: kind
    readonly cases: DiscriminatedCases<kind>
}

export type DiscriminatedCases<
    kind extends DiscriminantKind = DiscriminantKind
> = {
    [caseKey in CaseKey<kind>]?: DiscriminatedBranches
}

export type QualifiedDisjoint =
    | `${DiscriminantKind}`
    | `${string}/${DiscriminantKind}`

export const discriminate = (branches: PredicateNode[]) => {
    const discriminants = calculateDiscriminants(branches)
    const indices = branches.map((_, i) => i)
    return discriminateRecurse(branches, indices, discriminants)
}

const discriminateRecurse = (
    originalBranches: PredicateNode[],
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
    return {
        path: bestDiscriminant.path,
        kind: bestDiscriminant.kind,
        cases
    }
}

type Discriminants = {
    disjointsByPair: DisjointsByPair
    casesByDisjoint: CasesByDisjoint
}

type DisjointsByPair = Record<`${number}/${number}`, QualifiedDisjoint[]>

type CasesByDisjoint = {
    [k in QualifiedDisjoint]?: IndexCases
}

export type DiscriminantKinds = {
    domain: Domain
    class: DefaultObjectKind
    value: SerializedPrimitive
}

const discriminantKinds: keySet<DiscriminantKind> = {
    domain: true,
    class: true,
    value: true
}

export type DiscriminantKind = evaluate<keyof DiscriminantKinds>

const calculateDiscriminants = (branches: PredicateNode[]): Discriminants => {
    const discriminants: Discriminants = {
        disjointsByPair: {},
        casesByDisjoint: {}
    }
    for (let lIndex = 0; lIndex < branches.length - 1; lIndex++) {
        for (let rIndex = lIndex + 1; rIndex < branches.length; rIndex++) {
            const pairKey = `${lIndex}/${rIndex}` as const
            const pairDisjoints: QualifiedDisjoint[] = []
            discriminants.disjointsByPair[pairKey] = pairDisjoints
            const result = branches[lIndex].intersect(branches[rIndex])
            if (!(result instanceof DisjointNode)) {
                continue
            }
            for (const path in result.paths) {
                if (path.includes("mapped")) {
                    // containers could be empty and therefore their elements cannot be used to discriminate
                    // allowing this via a special case where both are length >0 tracked here:
                    // https://github.com/arktypeio/arktype/issues/593
                    continue
                }
                let kind: DisjointKind
                const disjointAtPath = result.paths[path]
                for (kind in disjointAtPath) {
                    if (!isKeyOf(kind, discriminantKinds)) {
                        continue
                    }
                    // TODO: fix
                    const lSerialized = String(disjointAtPath[kind]!.l)
                    const rSerialized = String(disjointAtPath[kind]!.r)
                    if (
                        lSerialized === undefined ||
                        rSerialized === undefined
                    ) {
                        continue
                    }
                    const qualifiedDisjoint: QualifiedDisjoint =
                        path === "/" ? kind : `${path}/${kind}`
                    pairDisjoints.push(qualifiedDisjoint)
                    if (!discriminants.casesByDisjoint[qualifiedDisjoint]) {
                        discriminants.casesByDisjoint[qualifiedDisjoint] = {
                            [lSerialized]: [lIndex],
                            [rSerialized]: [rIndex]
                        }
                        continue
                    }
                    const cases =
                        discriminants.casesByDisjoint[qualifiedDisjoint]!
                    const existingLBranch = cases[lSerialized]
                    if (!existingLBranch) {
                        cases[lSerialized] = [lIndex]
                    } else if (!existingLBranch.includes(lIndex)) {
                        existingLBranch.push(lIndex)
                    }
                    const existingRBranch = cases[rSerialized]
                    if (!existingRBranch) {
                        cases[rSerialized] = [rIndex]
                    } else if (!existingRBranch.includes(rIndex)) {
                        existingRBranch.push(rIndex)
                    }
                }
            }
        }
    }
    // TODO: sort wasn't necesssary before?
    let k: QualifiedDisjoint
    for (k in discriminants.casesByDisjoint) {
        for (const caseKey in discriminants.casesByDisjoint[k]) {
            discriminants.casesByDisjoint[k]![caseKey]!.sort()
        }
    }
    return discriminants
}

type Discriminant = {
    path: Path
    kind: DiscriminantKind
    indexCases: IndexCases
    score: number
}

const parseQualifiedDisjoint = (qualifiedDisjoint: QualifiedDisjoint) => {
    const path = Path.fromString(qualifiedDisjoint)
    return [path, path.pop()] as [path: Path, kind: DiscriminantKind]
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
