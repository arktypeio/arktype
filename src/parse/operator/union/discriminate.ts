import type { dictionary } from "../../../utils/dynamicTypes.js"
import { pushKey } from "../../../utils/paths.js"
import type { Attributes, AttributeTypes } from "../../state/attributes.js"
import { compileUnion } from "./compile.js"
import { prunePath } from "./prune.js"

export type DiscriminatedBranches<
    key extends DiscriminatedKey = DiscriminatedKey
> = ["?", ...DiscriminatedBranchTuple<key>]

export type DiscriminatedKey = "type" | "value"

type Discriminant = {
    path: string
    key: DiscriminatedKey
    score: number
}

type DiscriminatedBranchTuple<key extends DiscriminatedKey = DiscriminatedKey> =
    [path: string, key: key, cases: AttributeCases<key>]

type AttributeCases<key extends DiscriminatedKey = DiscriminatedKey> = {
    [k in DiscriminatedValue<key>]?: Attributes
}

type DiscriminatedValue<key extends DiscriminatedKey = DiscriminatedKey> =
    | AttributeTypes[key]
    | "unset"

export const discriminate = (
    branches: Attributes[]
): DiscriminatedBranches | undefined => {
    const discriminant = greedyDiscriminant("", branches)
    if (!discriminant) {
        return
    }
    const branchesByValue: dictionary<Attributes[]> = {}
    for (let i = 0; i < branches.length; i++) {
        const value = prunePath(
            branches[i],
            discriminant.path,
            discriminant.key
        )
        branchesByValue[value] ??= []
        branchesByValue[value].push(branches[i])
    }
    const cases: dictionary<Attributes> = {}
    for (const value in branchesByValue) {
        cases[value] = compileUnion(branchesByValue[value])
    }
    return ["?", discriminant.path, discriminant.key, cases]
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
            ? { path, key: "type", score: typeScore }
            : {
                  path,
                  key: "value",
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
