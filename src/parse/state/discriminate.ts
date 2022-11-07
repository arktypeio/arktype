import { pruneDeepEqual } from "../../utils/deepEquals.js"
import type { dictionary } from "../../utils/dynamicTypes.js"
import { pushKey } from "../../utils/paths.js"
import type {
    AttributeBranches,
    Attributes,
    DisjointKey
} from "./attributes.js"

type Discriminant = {
    path: string
    key: DisjointKey
    score: number
    branchesAtPath: Attributes[]
}

export const discriminate = (branches: Attributes[]): AttributeBranches => {
    if (branches.length === 1) {
        return branches
    }
    const nextDiscriminant = greedyDiscriminant("", branches)
    if (!nextDiscriminant) {
        return branches
    }
    const branchesByValue: dictionary<Attributes[]> = {}
    for (let i = 0; i < branches.length; i++) {
        const branchAtPath = nextDiscriminant.branchesAtPath[i]
        const value = branchAtPath[nextDiscriminant.key] ?? "default"
        delete branchAtPath[nextDiscriminant.key]
        branchesByValue[value] ??= []
        branchesByValue[value].push(branches[i])
    }
    const cases: dictionary<Attributes> = {}
    for (const value in branchesByValue) {
        const branches = branchesByValue[value]

        if (branches.length === 1) {
            cases[value] = branches[0]
        } else {
            const baseAttributes = pruneDeepEqual(branches)
            baseAttributes.branches = discriminate(branches)
            cases[value] = baseAttributes
        }
    }
    return { path: nextDiscriminant.path, key: nextDiscriminant.key, cases }
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
            ? { path, key: "type", branchesAtPath: branches, score: typeScore }
            : {
                  path,
                  key: "value",
                  branchesAtPath: branches,
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
                ? 1
                : appearancesByProp[propKey] + 1
        }
    }
    return Object.entries(appearancesByProp).sort((a, b) => b[1] - a[1])
}

const disjointScore = (branches: Attributes[], key: DisjointKey) => {
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
