import { deepEquals, isEmpty } from "../../utils/deepEquals.js"
import type { dictionary } from "../../utils/dynamicTypes.js"
import { throwInternalError } from "../../utils/internalArktypeError.js"
import { pushKey } from "../../utils/paths.js"
import type { AttributeKey, Attributes, DisjointKey } from "./attributes.js"

type Discriminant = {
    path: string
    key: DisjointKey
    score: number
}

// eslint-disable-next-line max-lines-per-function
export const discriminate = (branches: Attributes[]): Attributes => {
    if (branches.length === 0) {
        return throwInternalError(
            "Unexpectedly tried to discriminate between 0 branches."
        )
    }
    if (branches.length === 1) {
        return branches[0]
    }
    const base = mergeAndPrune(branches)
    if (branches.some((branch) => isEmpty(branch))) {
        return base
    }
    const nextDiscriminant = greedyDiscriminant("", branches)
    if (!nextDiscriminant) {
        base.branches = branches
        return base
    }
    const branchesByValue: dictionary<Attributes[]> = {}
    for (let i = 0; i < branches.length; i++) {
        const value = prunePath(
            branches[i],
            nextDiscriminant.path,
            nextDiscriminant.key
        )
        branchesByValue[value] ??= []
        branchesByValue[value].push(branches[i])
    }
    const cases: dictionary<Attributes> = {}
    for (const value in branchesByValue) {
        cases[value] = discriminate(branchesByValue[value])
    }
    base.branches = {
        path: nextDiscriminant.path,
        key: nextDiscriminant.key,
        cases
    }
    return base
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

// TODO: Add base prop. Or maybe just merge with other props?
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

// TODO: Add baseprop
const prunePath = (attributes: Attributes, path: string, key: DisjointKey) => {
    const segments = path === "" ? [] : path.split(".")
    const traversed: Attributes[] = []
    let lastAttributes = attributes
    for (const segment of segments) {
        if (!lastAttributes.props?.[segment]) {
            return "default"
        }
        traversed.push(lastAttributes)
        lastAttributes = lastAttributes.props[segment]
    }
    if (lastAttributes[key] === undefined) {
        return "default"
    }
    const prunedValue = lastAttributes[key]!
    delete lastAttributes[key]
    for (let i = traversed.length - 1; i >= 0; i--) {
        const traversedProps = traversed[i].props!
        if (isEmpty(traversedProps[segments[i]])) {
            delete traversedProps[segments[i]]
        } else {
            break
        }
        if (isEmpty(traversedProps)) {
            delete traversed[i].props
        } else {
            break
        }
    }
    return prunedValue
}

// eslint-disable-next-line max-lines-per-function
export const mergeAndPrune = (branches: Attributes[]): Attributes => {
    const base: Attributes = {}
    let k: AttributeKey
    for (k in branches[0]) {
        let allBranchesHaveAttribute = true
        const values = branches.map((branch) => {
            allBranchesHaveAttribute &&= branch[k] !== undefined
            return branch[k]
        })
        if (!allBranchesHaveAttribute) {
            continue
        }
        if (k === "baseProp") {
            const mergedBaseProp = mergeAndPrune(values as Attributes[])
            if (!isEmpty(mergedBaseProp)) {
                base.baseProp = mergedBaseProp
                for (const branch of branches) {
                    if (isEmpty(branch.baseProp!)) {
                        delete branch.baseProp
                    }
                }
            }
        } else if (k === "props") {
            for (const propKey in branches[0].props) {
                let allBranchesHaveProp = true
                const propValues = (values as dictionary<Attributes>[]).map(
                    (branchProps) => {
                        allBranchesHaveProp &&=
                            branchProps[propKey] !== undefined
                        return branchProps[propKey]
                    }
                )
                if (!allBranchesHaveProp) {
                    continue
                }
                const mergedProp = mergeAndPrune(propValues)
                if (!isEmpty(mergedProp)) {
                    base.props ??= {}
                    base.props[propKey] = mergedProp
                }
            }
            if (base.props) {
                for (const branch of branches) {
                    for (const propKey in base.props) {
                        if (isEmpty(branch.props![propKey])) {
                            delete branch.props![propKey]
                        }
                    }
                    if (isEmpty(branch.props!)) {
                        delete branch.props
                    }
                }
            }
        } else {
            if (values.every((value) => deepEquals(values[0], value))) {
                base[k] = values[0] as any
                for (const branch of branches) {
                    delete branch[k]
                }
            }
        }
    }
    return base
}
