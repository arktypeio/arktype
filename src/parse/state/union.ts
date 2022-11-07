/* eslint-disable max-lines-per-function */
import type { dictionary } from "../../utils/dynamicTypes.js"
import { pushKey } from "../../utils/paths.js"
import type {
    AttributeBranches,
    Attributes,
    AttributeTypes,
    DisjointKey
} from "./attributes.js"

type Discriminant = {
    path: string
    key: DisjointKey
    result: DiscriminationResult
}

type DiscriminationResult = {
    values: DiscriminatingValue[]
    score: number
}

type DiscriminatingValue = AttributeTypes[DisjointKey] | "default"

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
        const value = nextDiscriminant.result.values[i]
        branchesByValue[value] ??= []
        branchesByValue[value].push(branches[i])
    }
    const cases: dictionary<Attributes> = {}
    for (const value in branchesByValue) {
        const branches = branchesByValue[value]
        cases[value] =
            branches.length === 1
                ? branches[0]
                : { branches: discriminate(branches) }
    }
    return { path: "", key: nextDiscriminant.key, cases }
}

const greedyDiscriminant = (
    path: string,
    branches: Attributes[]
): Discriminant | undefined => {
    return (
        greedyShallowDiscriminant(path, branches) ??
        greedyPropsDiscriminant(path, branches)
    )
}

const greedyShallowDiscriminant = (path: string, branches: Attributes[]) => {
    const typeDiscriminatedResult = discriminateKey(branches, "type")
    const valueDiscriminatedResult = discriminateKey(branches, "value")
    const shallowDiscriminant: Discriminant =
        typeDiscriminatedResult.score > valueDiscriminatedResult.score
            ? { path, key: "type", result: typeDiscriminatedResult }
            : { path, key: "value", result: valueDiscriminatedResult }
    if (shallowDiscriminant.result.score > 0) {
        return shallowDiscriminant
    }
}

const greedyPropsDiscriminant = (path: string, branches: Attributes[]) => {
    let bestDiscriminant: Discriminant | undefined
    const sortedPropFrequencies = sortPropsByFrequency(branches)
    for (const [propKey, branchAppearances] of sortedPropFrequencies) {
        const maxScore = maxEdges(branchAppearances)
        if (bestDiscriminant && bestDiscriminant.result.score >= maxScore) {
            return bestDiscriminant
        }
        const propDiscriminant = greedyDiscriminant(
            pushKey(path, propKey),
            branches.map((branch) => branch.props?.[propKey] ?? {})
        )
        if (
            propDiscriminant &&
            (!bestDiscriminant ||
                propDiscriminant.result.score > bestDiscriminant.result.score)
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
    // TODO: Check sorting
    return Object.entries(appearancesByProp).sort((a, b) => b[1] - a[1])
}

const discriminateKey = (branches: Attributes[], key: DisjointKey) => {
    let score = 0
    const values = branches.map((branch, i) => {
        for (
            let pairedIndex = i + 1;
            pairedIndex < branches.length;
            pairedIndex++
        ) {
            if (
                branch[key] &&
                branches[pairedIndex][key] &&
                branch[key] !== branches[pairedIndex][key]
            ) {
                score++
            }
        }
        return branch[key] ?? "default"
    })
    return {
        values,
        score
    }
}
