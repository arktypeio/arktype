import type { ElementOf, List } from "../common.js"
import { deepEquals } from "./diff.js"
import type { SetChange, UnorderedDiffState } from "./unordered.js"
import {
    findDeepEqualIndices,
    findFirstDeepEqualIndex,
    toDiffSetsResult
} from "./unordered.js"

type DiffSetsState = UnorderedDiffState & {
    removedDuplicateIndices: Record<number, true>
    seenCompareItems: any[]
}

export const diffSets = <Base extends List, Compare extends List>(
    base: Base,
    compare: Compare
): SetChange<ElementOf<Base> | ElementOf<Compare>> | undefined => {
    const state: DiffSetsState = {
        added: [],
        removed: [],
        unseenCompareItems: [...compare],
        seenCompareItems: [],
        removedDuplicateIndices: {},
        baseIndex: 0
    }
    for (; state.baseIndex < base.length; state.baseIndex++) {
        diffCurrentSetIndex(base, compare, state)
    }
    for (const unseenIndex in state.unseenCompareItems) {
        state.added.push(state.unseenCompareItems[unseenIndex])
    }
    return toDiffSetsResult(state.added, state.removed)
}

const diffCurrentSetIndex = (base: any, compare: any, state: DiffSetsState) => {
    if (state.baseIndex in state.removedDuplicateIndices) {
        return
    }
    const matchingUnseenIndices = findDeepEqualIndices(
        state.unseenCompareItems,
        base[state.baseIndex],
        "set"
    )
    if (matchingUnseenIndices.length > 0) {
        // Even if there was more than one match, we only need to push one copy to seen
        state.seenCompareItems.push(
            state.unseenCompareItems[matchingUnseenIndices[0]]
        )
        for (const matchingIndex of matchingUnseenIndices) {
            delete state.unseenCompareItems[matchingIndex]
        }
    } else {
        // When there are no matching unseen indices, check for matches in seen
        if (
            findFirstDeepEqualIndex(
                state.seenCompareItems,
                base[state.baseIndex],
                "set"
            ) === -1
        ) {
            // If there are no matches in unseen or seen, add it to removed
            state.removed.push(base[state.baseIndex])
            markDuplicateIndices(base, state)
        }
    }
}

// By adding these indices to the list of known duplicates, we avoid comparing them again.
export const markDuplicateIndices = (base: any, state: DiffSetsState) => {
    for (
        let possibleDuplicateIndex = state.baseIndex + 1;
        possibleDuplicateIndex < base.length;
        possibleDuplicateIndex++
    ) {
        if (
            deepEquals(base[state.baseIndex], base[possibleDuplicateIndex], {
                listComparison: "set"
            })
        ) {
            state.removedDuplicateIndices[possibleDuplicateIndex] = true
        }
    }
}
