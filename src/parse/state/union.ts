/* eslint-disable max-lines */
/* eslint-disable max-lines-per-function */
import type { mutable } from "../../utils/generics.js"
import { pushKey } from "../../utils/generics.js"
import type {
    AttributeBranches,
    AttributeKey,
    Attributes
} from "./attributes.js"

type PathDistribution = Record<string, AttributeDistribution>
type AttributeDistribution = { [key in AttributeKey]?: ValueByBranchIndex }
type ValueByBranchIndex = Record<number, string>
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
    const next = discriminantEntries.shift()
    if (!next) {
        return {}
    }
    return {
        branches: discriminate(next, discriminantEntries, distribution)
    }
}

const graphDiscriminants = (
    distribution: PathDistribution,
    branchCount: number
): DiscriminantEntry[] => {
    const discriminantEntries: DiscriminantEntry[] = []
    for (const path in distribution) {
        const pathAttributes = distribution[path]
        let k: AttributeKey
        for (k in pathAttributes) {
            if (k !== "type" && k !== "value") {
                continue
            }
            const valuesByIndex = pathAttributes[k]!
            const graph: DiscriminantGraph = { size: 0 }
            for (let i = 0; i < branchCount; i++) {
                graph[i] = {}
                const firstValue = valuesByIndex[i]
                for (let j = 0; j < i; j++) {
                    const secondValue = valuesByIndex[j]
                    if (
                        firstValue === undefined ||
                        secondValue === undefined ||
                        firstValue === secondValue
                    ) {
                        graph[i][j] = true
                        graph[j][i] = true
                        graph.size++
                    }
                }
            }
            const pathEntry: DiscriminantEntry = [path, k, graph]
            if (graph.size === 0) {
                return [pathEntry]
            }
            if (
                discriminantEntries[0] &&
                graph.size < discriminantEntries[0][2].size
            ) {
                discriminantEntries.unshift(pathEntry)
            } else {
                discriminantEntries.push(pathEntry)
            }
        }
    }
    return discriminantEntries
}

const discriminate = (
    head: DiscriminantEntry,
    tail: DiscriminantEntry[],
    distribution: PathDistribution
): AttributeBranches => {
    const [path, key, undiscriminated] = head
    let currentMinCount = undiscriminated.size
    const nextDiscriminantEntries: DiscriminantEntry[] = []
    for (const [path, key, discriminants] of tail) {
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
    const next = nextDiscriminantEntries.shift()
    return [
        path,
        {
            [key]: next
                ? discriminate(next, nextDiscriminantEntries, distribution)
                : {}
        }
    ]
}

const addBranchPaths = (
    result: PathDistribution,
    attributes: Attributes,
    path: string,
    branchIndex: number
) => {
    let k: AttributeKey
    for (k in attributes) {
        if (k === "baseProp") {
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
        } else {
            const value = String(attributes[k])
            result[path] ??= {}
            result[path][k] ??= {}
            result[path][k]![branchIndex] ??= value
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
