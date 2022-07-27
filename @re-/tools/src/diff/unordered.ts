import { asNumber } from "../stringUtils.js"
import { deepEquals, ListComparisonMode } from "./diff.js"

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
    for (const i in list) {
        if (
            deepEquals(item, list[i], {
                listComparison: mode
            })
        ) {
            matchingIndices.push(asNumber(i, { assert: true }))
        }
    }
    return matchingIndices
}

export const findFirstDeepEqualIndex = (
    list: unknown[],
    item: unknown,
    mode: UnorderedDiffMode
) => {
    for (const i in list) {
        if (
            deepEquals(item, list[i], {
                listComparison: mode
            })
        ) {
            return asNumber(i, { assert: true })
        }
    }
    return -1
}
