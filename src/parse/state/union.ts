/* eslint-disable max-lines */
/* eslint-disable max-lines-per-function */
import type { mutable, subtype } from "../../utils/generics.js"
import { pushKey } from "../../utils/generics.js"
import type {
    AttributeBranches,
    AttributeKey,
    Attributes
} from "./attributes.js"

type PathDistribution = Record<string, AttributeDistribution>
type AttributeDistribution = { [key in AttributeKey]?: BranchIndicesByValue }
type BranchIndicesByValue = Record<string, number[]>
type DiscriminantEntry = [
    path: string,
    key: AttributeKey,
    discriminants: DiscriminantGraph
]
type DiscriminantGraph = Record<number, DiscriminantNeighbors> & {
    size: number
}
type DiscriminantNeighbors = Record<number, true>

export const union = (branches: Attributes[]): Attributes => {
    const distribution: PathDistribution = {}
    for (let i = 0; i < branches.length; i++) {
        addBranchPaths(distribution, branches[i], "", i)
    }
    const discriminantEntries = graphDiscriminants(
        distribution,
        branches.length
    )
    return {
        branches: createDiscriminatedBranches(
            initializeUndiscriminated(branches.length),
            discriminantEntries,
            distribution,
            branches
        )
    }
}

const graphDiscriminants = (
    distribution: PathDistribution,
    branchCount: number
): DiscriminantEntry[] => {
    const discriminantEntries: DiscriminantEntry[] = []
    const maxPossibleSize = branchCount * (branchCount - 1)
    for (const path in distribution) {
        const pathAttributes = distribution[path]
        let k: AttributeKey
        for (k in pathAttributes) {
            const pathAttribute = pathAttributes[k]!
            const values = Object.keys(pathAttribute)
            if (values.length > 1) {
                const graph: DiscriminantGraph = { size: 0 }
                for (
                    let valueIndex = 0;
                    valueIndex < values.length;
                    valueIndex++
                ) {
                    const branchesWithValue = pathAttribute[values[valueIndex]]
                    const discriminantNeighbors: DiscriminantNeighbors = {}
                    for (
                        let neighboringValueIndex = 0;
                        neighboringValueIndex < values.length;
                        neighboringValueIndex++
                    ) {
                        if (valueIndex !== neighboringValueIndex) {
                            for (const branchIndex of pathAttribute[
                                values[neighboringValueIndex]
                            ]) {
                                discriminantNeighbors[branchIndex] = true
                                graph.size += branchesWithValue.length
                            }
                        }
                    }
                    for (const branchIndex of branchesWithValue) {
                        graph[branchIndex] = discriminantNeighbors
                    }
                }
                const pathEntry: DiscriminantEntry = [path, k, graph]
                if (graph.size === maxPossibleSize) {
                    return [pathEntry]
                }
                if (
                    discriminantEntries[0] &&
                    graph.size > discriminantEntries[0][2].size
                ) {
                    discriminantEntries.unshift(pathEntry)
                } else {
                    discriminantEntries.push(pathEntry)
                }
            }
        }
    }
    return discriminantEntries
}

const createDiscriminatedBranches = (
    undiscriminated: DiscriminantGraph,
    discriminantEntries: DiscriminantEntry[],
    distribution: PathDistribution,
    originalBranches: Attributes[]
) => {
    const nextEntry = discriminantEntries.shift()
    if (!nextEntry) {
        return {}
    }
    const valuesAtPath = distribution[nextEntry[0]][nextEntry[1]]
    const branches: mutable<AttributeBranches[1]> = {}
    for (const value in valuesAtPath) {
        const branchIndices = valuesAtPath[value]
        if (branchIndices.length === 1) {
            branches[value] = originalBranches[branchIndices[0]] as any
        } else {
            branches[value] = discriminate(
                substractDiscriminants(undiscriminated, nextEntry[2]),
                discriminantEntries,
                distribution,
                originalBranches
            )
        }
    }
    return [nextEntry[0], { [nextEntry[1]]: branches }]
}

const discriminate = (
    undiscriminated: DiscriminantGraph,
    discriminantEntries: DiscriminantEntry[],
    distribution: PathDistribution,
    originalBranches: Attributes[]
) => {
    let currentMinCount = undiscriminated.size
    const nextDiscriminantEntries: DiscriminantEntry[] = []
    for (const [path, key, discriminants] of discriminantEntries) {
        const candidate = substractDiscriminants(undiscriminated, discriminants)
        if (candidate.size < currentMinCount) {
            nextDiscriminantEntries.unshift([path, key, candidate])
            currentMinCount = candidate.size
            if (candidate.size === 0) {
                break
            }
        } else if (candidate.size < undiscriminated.size) {
            nextDiscriminantEntries.push([path, key, candidate])
        }
    }
    return createDiscriminatedBranches(
        undiscriminated,
        nextDiscriminantEntries,
        distribution,
        originalBranches
    )
}

type DiscriminatableKey = subtype<
    AttributeKey,
    "type" | "value" | "props" | "baseProp"
>

const addBranchPaths = (
    result: PathDistribution,
    attributes: Attributes,
    path: string,
    branchIndex: number
) => {
    let k: AttributeKey
    for (k in attributes) {
        if (k === "type" || k === "value") {
            const value = String(attributes[k])
            result[path] ??= {}
            result[path][k] ??= {}
            result[path][k]![value] ??= []
            result[path][k]![value].push(branchIndex)
        } else if (k === "baseProp") {
            addBranchPaths(
                result,
                attributes[k]!,
                pushKey(path, "baseProp"),
                branchIndex
            )
        } else if (k === "props") {
            for (const propKey in attributes[k]) {
                addBranchPaths(
                    result,
                    attributes[k]![propKey],
                    pushKey(path, "props." + propKey),
                    branchIndex
                )
            }
        }
    }
}

const addAtPath = (o: any, path: string, value: unknown) => {}

const initializeUndiscriminated = (branchCount: number): DiscriminantGraph => {
    const graph: DiscriminantGraph = {
        size: branchCount * (branchCount - 1)
    }
    for (let i = 0; i < branchCount; i++) {
        graph[i] = []
        for (let j = 0; j < branchCount; j++) {
            if (i !== j) {
                graph[i][j] = true
            }
        }
    }
    return graph
}

const substractDiscriminants = (
    undiscriminated: DiscriminantGraph,
    discriminants: DiscriminantGraph
): DiscriminantGraph => {
    const graph: DiscriminantGraph = { size: 0 }
    for (const branchIndex in discriminants) {
        const undiscriminatedBranch = undiscriminated[branchIndex]
        for (const neighborIndex in undiscriminatedBranch) {
            if (!discriminants[branchIndex][neighborIndex]) {
                graph[branchIndex] ??= {}
                graph[branchIndex][neighborIndex] = true
                graph.size++
            }
        }
    }
    return graph
}

// export const goal: AppearancesByPath = {
//     type: {
//         dictionary: [0, 1, 2]
//     },
//     "props/a/type": {
//         string: [0, 1],
//         number: [2]
//     },
//     "props/b/type": {
//         boolean: [2]
//     },
//     "props/c/type": {
//         number: [1]
//     },
//     "props/requiredKeys/a": {
//         true: [1]
//     }
// }

// const discriminatingPaths: Record<
//     string,
//     Record<number, Record<number, true>>
// > = {
//     "props/a/type": {
//         0: { 2: true, 3: true }, // 0: {1: true}
//         1: { 2: true, 3: true }, // 1: {0: true}
//         2: { 0: true, 1: true }, // 2: {3: true}
//         3: { 0: true, 1: true } // 3: {2: true}
//     },
//     "props/b/type": {
//         0: { 1: true, 3: true },
//         1: { 0: true, 2: true },
//         2: { 1: true, 3: true },
//         3: { 0: true, 2: true }
//     }
// }
