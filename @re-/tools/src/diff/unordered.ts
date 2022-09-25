import type { ListComparisonMode } from "./diff.js"
import { deepEquals } from "./diff.js"

export type UnorderedDiffMode = Exclude<ListComparisonMode, "ordered">

export const toDiffSetsResult = <T>(added: T[], removed: T[]) => {
    if (added.length) {
        if (removed.length) {
            return { added, removed }
        }
        return { added }
    } else {
        if (removed.length) {
            return { removed }
        }
        return undefined
    }
}

export type SetChange<T> = ReturnType<typeof toDiffSetsResult<T>>

export type UnorderedDiffState = {
    added: any[]
    removed: any[]
    unseenCompareItems: any[]
    baseIndex: number
}

export const findDeepEqualIndices = (
    list: unknown[],
    item: unknown,
    mode: UnorderedDiffMode
) => {
    const matchingIndices = []
    for (let i = 0; i < list.length; i++) {
        if (
            deepEquals(item, list[i], {
                listComparison: mode
            })
        ) {
            matchingIndices.push(i)
        }
    }
    return matchingIndices
}

export const findFirstDeepEqualIndex = (
    list: unknown[],
    item: unknown,
    mode: UnorderedDiffMode
) => {
    for (let i = 0; i < list.length; i++) {
        if (
            deepEquals(item, list[i], {
                listComparison: mode
            })
        ) {
            return i
        }
    }
    return -1
}
