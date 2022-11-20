import type { ScopeRoot } from "../../../../scope.js"
import type { dictionary } from "../../../../utils/dynamicTypes.js"
import { pushKey } from "../../../../utils/paths.js"
import type {
    AttributePath,
    Attributes,
    CompiledAttributes,
    UnionBranches
} from "../attributes.js"
import { compress } from "./compress.js"
import { pruneDiscriminant } from "./prune.js"

export type DiscriminatedKey = "type" | "value"

export type DiscriminatedPath = AttributePath<DiscriminatedKey>

type Discriminant = {
    path: DiscriminatedPath
    score: number
}

export const discriminate = (
    base: Attributes,
    scope: ScopeRoot
): CompiledAttributes => {
    if (!base.branches) {
        return base
    }
    const compiled: CompiledAttributes = base
    if (base.branches[0] === "|") {
        compiled.branches = discriminateBranches(base.branches[1], scope)
    } else {
        compiled.branches = [
            "&",
            base.branches[1].map((intersectedUnion) =>
                discriminateBranches(intersectedUnion[1], scope)
            )
        ]
    }
    return compiled
}

const discriminateBranches = (
    branches: Attributes[],
    scope: ScopeRoot
): UnionBranches<true> => {
    const discriminant = greedyDiscriminant("", branches)
    if (!discriminant) {
        return ["|", branches]
    }
    const branchesByValue: dictionary<Attributes[]> = {}
    for (let i = 0; i < branches.length; i++) {
        const value =
            pruneDiscriminant(branches[i], discriminant.path) ?? "default"
        branchesByValue[value] ??= []
        branchesByValue[value].push(branches[i])
    }
    const cases: dictionary<CompiledAttributes> = {}
    for (const value in branchesByValue) {
        const base: Attributes = compress(branchesByValue[value], scope)
        cases[value] = discriminate(base, scope)
    }
    return ["?", discriminant.path, cases]
}

const greedyDiscriminant = (
    path: string,
    branches: Attributes[]
): Discriminant | undefined =>
    greedyShallowDiscriminant(path, branches) ??
    greedyPropsDiscriminant(path, branches)

const greedyShallowDiscriminant = (
    path: string,
    branches: Attributes[]
): Discriminant | undefined => {
    const typeScore = disjointScore(branches, "type")
    const valueScore = disjointScore(branches, "value")
    if (typeScore || valueScore) {
        return typeScore > valueScore
            ? { path: finalizeDiscriminantPath(path, "type"), score: typeScore }
            : {
                  path: finalizeDiscriminantPath(path, "value"),
                  score: valueScore
              }
    }
}

const greedyPropsDiscriminant = (path: string, branches: Attributes[]) => {
    let bestDiscriminant: Discriminant | undefined
    const sortedPropFrequencies = sortPropsByFrequency(branches)
    for (const [propKey, branchAppearances] of sortedPropFrequencies) {
        const maxScore = maxEdges(branchAppearances)
        if (bestDiscriminant && bestDiscriminant.score >= maxScore) {
            return bestDiscriminant
        }
        const propDiscriminant = greedyDiscriminant(
            pushKey(path, propKey),
            branches.map((branch) => branch.props?.[propKey] ?? {})
        )
        if (
            propDiscriminant &&
            (!bestDiscriminant ||
                propDiscriminant.score > bestDiscriminant.score)
        ) {
            bestDiscriminant = propDiscriminant
        }
    }
    return bestDiscriminant
}

const maxEdges = (vertexCount: number) => (vertexCount * (vertexCount - 1)) / 2

type PropFrequencyEntry = [propKey: string, appearances: number]

const sortPropsByFrequency = (branches: Attributes[]): PropFrequencyEntry[] => {
    const appearancesByProp: dictionary<number> = {}
    for (let i = 0; i < branches.length; i++) {
        if (!branches[i].props) {
            continue
        }
        for (const propKey in branches[i].props) {
            appearancesByProp[propKey] = appearancesByProp[propKey]
                ? appearancesByProp[propKey] + 1
                : 1
        }
    }
    return Object.entries(appearancesByProp).sort((a, b) => b[1] - a[1])
}

const disjointScore = (branches: Attributes[], key: DiscriminatedKey) => {
    let score = 0
    for (let i = 0; i < branches.length; i++) {
        for (let j = i + 1; j < branches.length; j++) {
            if (
                branches[i][key] &&
                branches[j][key] &&
                branches[i][key] !== branches[j][key]
            ) {
                score++
            }
        }
    }
    return score
}

const finalizeDiscriminantPath = (path: string, key: DiscriminatedKey) =>
    path ? (`${path}.${key}` as const) : key
