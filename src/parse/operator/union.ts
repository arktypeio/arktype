/* eslint-disable max-lines */
/* eslint-disable max-lines-per-function */
import type { maybePush } from "../common.js"
import type { Attributes, keySet } from "../state/attributes.js"
import { State } from "../state/state.js"
import type { LeftBound } from "./bounds/left.js"
import { Intersection } from "./intersection.js"

export namespace Union {
    export const parse = (s: State.DynamicWithRoot) => {
        Intersection.mergeDescendantsToRootIfPresent(s)
        s.branches.union ??= []
        s.branches.union.push(s.root)
        s.root = State.unset
        return s
    }

    export type parse<s extends State.StaticWithRoot> =
        s extends State.StaticWithOpenLeftBound
            ? LeftBound.unpairedError<s>
            : State.from<{
                  root: undefined
                  branches: {
                      leftBound: undefined
                      intersection: undefined
                      union: [collectBranches<s>, "|"]
                  }
                  groups: s["groups"]
                  unscanned: s["unscanned"]
              }>

    export type collectBranches<s extends State.StaticWithRoot> = maybePush<
        s["branches"]["union"],
        Intersection.collectBranches<s>
    >

    export const mergeDescendantsToRootIfPresent = (
        s: State.DynamicWithRoot
    ) => {
        Intersection.mergeDescendantsToRootIfPresent(s)
        if (!s.branches.union) {
            return s
        }
        s.branches.union.push(s.root)
        s.root = union(s.branches.union)
        delete s.branches.union
        return s
    }

    type DistributionPathMap = Record<string, BranchIndicesByValue>
    type BranchIndicesByValue = Record<string, number[]>
    type DiscriminantEntry = [path: string, discriminants: DiscriminantGraph]
    type DiscriminantGraph = Record<number, DiscriminantNeighbors> & {
        size: number
    }
    type DiscriminantNeighbors = Record<number, true>

    const union = (branches: Attributes[]): Attributes => {
        const appearances: DistributionPathMap = {}
        for (const branch of branches) {
            addBranchPaths(appearances, branch)
        }
        const discriminantEntries = graphDiscriminants(
            appearances,
            branches.length
        )
        // TODO: No entries?
        const [initialPath, initialDiscriminants] = discriminantEntries.shift()!
        const undiscriminated = substractDiscriminants(
            initializeUndiscriminated(branches.length),
            initialDiscriminants
        )
        const optimalDiscriminantSequence = [
            initialPath,
            ...discriminate(undiscriminated, discriminantEntries)
        ]

        // // const root: Attributes = {}
        // // const value = values[0]
        // // const branchAppearances = pathAppearances[value]
        // // if (branchAppearances.length === branches.length) {
        // //     addAtPath(root, path, value)
        // // } else {
        // //     for (const branchIndex of branchAppearances) {
        // //         addAtPath(discriminatedBranches[branchIndex], path, value)
        // //     }
        // // }
        return {
            branches: []
        }
    }

    const graphDiscriminants = (
        appearances: DistributionPathMap,
        branchCount: number
    ): DiscriminantEntry[] => {
        const discriminantEntries: DiscriminantEntry[] = []
        const maxPossibleSize = branchCount * (branchCount - 1)
        for (const path in appearances) {
            const pathAppearances = appearances[path]
            const values = Object.keys(pathAppearances)
            if (values.length > 1) {
                const graph: DiscriminantGraph = { size: 0 }
                for (
                    let valueIndex = 0;
                    valueIndex < values.length;
                    valueIndex++
                ) {
                    const branchesWithValue =
                        pathAppearances[values[valueIndex]]
                    const discriminantNeighbors: DiscriminantNeighbors = {}
                    for (
                        let neighboringValueIndex = 0;
                        neighboringValueIndex < values.length;
                        neighboringValueIndex++
                    ) {
                        if (valueIndex !== neighboringValueIndex) {
                            for (const branchIndex of pathAppearances[
                                values[neighboringValueIndex]
                            ]) {
                                discriminantNeighbors[branchIndex] = true
                                graph.size++
                            }
                        }
                    }
                    for (const branchIndex of branchesWithValue) {
                        graph[branchIndex] = discriminantNeighbors
                    }
                }
                const pathEntry: DiscriminantEntry = [path, graph]
                if (graph.size === maxPossibleSize) {
                    return [pathEntry]
                }
                if (
                    discriminantEntries[0] &&
                    graph.size > discriminantEntries[0][1].size
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
        undiscriminated: DiscriminantGraph,
        discriminantEntries: DiscriminantEntry[]
    ) => {
        let currentMinCount = undiscriminated.size
        const nextDiscriminantEntries: DiscriminantEntry[] = []
        for (const [path, discriminants] of discriminantEntries) {
            const candidate = substractDiscriminants(
                undiscriminated,
                discriminants
            )
            if (candidate.size < currentMinCount) {
                nextDiscriminantEntries.unshift([path, candidate.graph])
                currentMinCount = candidate.size
                if (candidate.size === 0) {
                    optimalDiscriminantSequence.push(path)
                    return optimalDiscriminantSequence
                }
            } else if (candidate.size < undiscriminated.size) {
                nextDiscriminantEntries.push([path, candidate.graph])
            }
        }
    }

    const addAtPath = (o: any, path: string, value: unknown) => {}

    const addBranchPaths = (
        appearances: DistributionPathMap,
        branch: Attributes
    ) => {}

    const initializeUndiscriminated = (
        branchCount: number
    ): DiscriminantGraph => {
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
    ): DiscriminatedBranchDifference => {
        const difference: DiscriminantGraph = {}
        let count = 0
        for (const branchIndex in discriminants) {
            const undiscriminatedBranch = undiscriminated[branchIndex]
            for (const neighborIndex in undiscriminatedBranch) {
                if (!discriminants[branchIndex][neighborIndex]) {
                    difference[branchIndex] ??= {}
                    difference[branchIndex][neighborIndex] = true
                    count++
                }
            }
        }
        return { graph: difference, count }
    }
}

// export const testBranches: Attributes[] = [
//     { type: "dictionary", props: { a: { type: "string" } } },
//     {
//         type: "dictionary",
//         props: { a: { type: "string" }, c: { type: "number" } },
//         requiredKeys: { a: true }
//     },
//     {
//         type: "dictionary",
//         props: { a: { type: "number" }, b: { type: "boolean" } }
//     }
// ]

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
