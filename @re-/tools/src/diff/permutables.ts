import type { ElementOf, List } from "../common.js"
import type { SetChange, UnorderedDiffState } from "./unordered.js"
import { findFirstDeepEqualIndex, toDiffSetsResult } from "./unordered.js"

export const diffPermutables = <Base extends List, Compare extends List>(
    base: Base,
    compare: Compare
): SetChange<ElementOf<Base> | ElementOf<Compare>> | undefined => {
    const state: UnorderedDiffState = {
        added: [],
        removed: [],
        unseenCompareItems: [...compare],
        baseIndex: 0
    }
    for (; state.baseIndex < base.length; state.baseIndex++) {
        const matchingUnseenIndex = findFirstDeepEqualIndex(
            state.unseenCompareItems,
            base[state.baseIndex],
            "permutable"
        )
        if (matchingUnseenIndex === -1) {
            state.removed.push(base[state.baseIndex])
        } else {
            delete state.unseenCompareItems[matchingUnseenIndex]
        }
    }
    for (const unseenIndex in state.unseenCompareItems) {
        state.added.push(state.unseenCompareItems[unseenIndex])
    }
    return toDiffSetsResult(state.added, state.removed)
}
