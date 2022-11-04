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
        s.root = discriminate(s.branches.union)
        delete s.branches.union
        return s
    }

    type AppearancesByPath = Record<string, Record<string, number[]>>
    type DiscriminatingPaths = Record<string, DiscriminatedBranchMap>
    type DiscriminatedBranchMap = Record<number, BranchSet>
    type BranchSet = Record<number, true>
    type DiscriminatingPathsByDistinctValueCount = Record<number, string[]>

    const discriminate = (branches: Attributes[]): Attributes => {
        const appearances: AppearancesByPath = {}
        for (const branch of branches) {
            addBranchPaths(appearances, branch)
        }
        const discriminatingPaths: DiscriminatingPaths = {}
        let discriminatingPathsByDistinctValueCount: DiscriminatingPathsByDistinctValueCount =
            {}
        for (const path in appearances) {
            const pathAppearances = appearances[path]
            const values = Object.keys(pathAppearances)
            if (values.length > 1) {
                const discriminatedBranchMap: DiscriminatedBranchMap = {}
                for (const value of values) {
                    const branchesWithValue = pathAppearances[value]
                    const branchesWithDisjointValue: BranchSet = {}
                    for (const possibleDisjointValue of values) {
                        if (possibleDisjointValue !== value) {
                            const disjoinedBranchIndices =
                                pathAppearances[possibleDisjointValue]
                            for (const i of disjoinedBranchIndices) {
                                branchesWithDisjointValue[i] = true
                            }
                        }
                    }
                    for (const branchIndex of branchesWithValue) {
                        discriminatedBranchMap[branchIndex] =
                            branchesWithDisjointValue
                    }
                }
                discriminatingPaths[path] = discriminatedBranchMap
                if (values.length === branches.length) {
                    // If the value is disjoint across all branches, it is
                    // sufficient to discriminate the union by itself, so we can
                    // ignore all other discriminating paths and stop looping.
                    discriminatingPathsByDistinctValueCount = {
                        [values.length]: [path]
                    }
                    break
                } else {
                    discriminatingPathsByDistinctValueCount[values.length] ??=
                        []
                    discriminatingPathsByDistinctValueCount[values.length].push(
                        path
                    )
                }
            }
        }
        // TODO: Case where no discriminating paths
        const discriminatingValueCounts = Object.keys(
            discriminatingPathsByDistinctValueCount
        )
            .map((lengthKey) => Number(lengthKey))
            .sort((a, b) => b - a)
        const bestInitialPath =
            discriminatingPathsByDistinctValueCount[
                discriminatingValueCounts[discriminatingValueCounts.length - 1]
            ][0]
        let undiscriminated = substractDiscriminatedBranchMap(
            initializeUndiscriminated(branches.length),
            discriminatingPaths[bestInitialPath]
        )
        const bestTraversal = [bestInitialPath]
        delete discriminatingPaths[bestInitialPath]
        while (Object.keys(undiscriminated).length) {
            let bestPath
            let bestResult: DiscriminatedBranchDifference | undefined
            for (const path in discriminatingPaths) {
                const candidate = substractDiscriminatedBranchMap(
                    undiscriminated,
                    discriminatingPaths[path]
                )
                if (
                    candidate.count <
                    (bestResult ? bestResult.count : undiscriminated.count)
                ) {
                    bestPath = path
                    bestResult = candidate
                    if (candidate.count === 0) {
                        break
                    }
                } else if (candidate.count === undiscriminated.count) {
                    delete discriminatingPaths[path]
                }
                // TODO: Should update discriminatingPaths to reflect current discriminating? Could be cleaner with loop.
            }
            if (bestPath) {
                undiscriminated = bestResult!
                bestTraversal.push(bestPath)
            }
        }
        // const root: Attributes = {}
        // const value = values[0]
        // const branchAppearances = pathAppearances[value]
        // if (branchAppearances.length === branches.length) {
        //     addAtPath(root, path, value)
        // } else {
        //     for (const branchIndex of branchAppearances) {
        //         addAtPath(discriminatedBranches[branchIndex], path, value)
        //     }
        // }
        return {
            branches: []
        }
    }

    const addAtPath = (o: any, path: string, value: unknown) => {}

    const addBranchPaths = (
        appearances: AppearancesByPath,
        branch: Attributes
    ) => {}

    type UndiscriminatedBranches = Record<number, number[]>

    const initializeUndiscriminated = (branchCount: number) => {
        const undiscriminatedBranches: UndiscriminatedBranches = {}
        for (let i = 0; i < branchCount; i++) {
            undiscriminatedBranches[i] = []
            for (let j = 0; j < branchCount; j++) {
                if (i !== j) {
                    undiscriminatedBranches[i].push(j)
                }
            }
        }
        return undiscriminatedBranches
    }

    type DiscriminatedBranchDifference = {
        branches: UndiscriminatedBranches
        count: number
    }

    const substractDiscriminatedBranchMap = (
        undiscriminated: UndiscriminatedBranches,
        discriminatedBranchMap: DiscriminatedBranchMap
    ): DiscriminatedBranchDifference => {
        const branches: UndiscriminatedBranches = {}
        let count = 0
        for (const branchIndex in discriminatedBranchMap) {
            const discriminatedAtBranch = discriminatedBranchMap[branchIndex]
            const remainingUndiscriminatedForBranch = undiscriminated[
                branchIndex
            ].filter((i) => !discriminatedAtBranch[i])
            if (remainingUndiscriminatedForBranch.length) {
                branches[branchIndex] = remainingUndiscriminatedForBranch
                count += remainingUndiscriminatedForBranch.length
            }
        }
        return { branches, count }
    }
}

type AppearancesByPath = Record<string, Record<string, number[]>>

export const testBranches: Attributes[] = [
    { type: "dictionary", props: { a: { type: "string" } } },
    {
        type: "dictionary",
        props: { a: { type: "string" }, c: { type: "number" } },
        requiredKeys: { a: true }
    },
    {
        type: "dictionary",
        props: { a: { type: "number" }, b: { type: "boolean" } }
    }
]

export const goal: AppearancesByPath = {
    type: {
        dictionary: [0, 1, 2]
    },
    "props/a/type": {
        string: [0, 1],
        number: [2]
    },
    "props/b/type": {
        boolean: [2]
    },
    "props/c/type": {
        number: [1]
    },
    "props/requiredKeys/a": {
        true: [1]
    }
}

const discriminatingPaths: Record<
    string,
    Record<number, Record<number, true>>
> = {
    "props/a/type": {
        0: { 2: true, 3: true }, // 0: {1: true}
        1: { 2: true, 3: true }, // 1: {0: true}
        2: { 0: true, 1: true }, // 2: {3: true}
        3: { 0: true, 1: true } // 3: {2: true}
    },
    "props/b/type": {
        0: { 1: true, 3: true },
        1: { 0: true, 2: true },
        2: { 1: true, 3: true },
        3: { 0: true, 2: true }
    }
}
