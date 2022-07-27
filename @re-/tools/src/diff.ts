import {
    ElementOf,
    isEmpty,
    isRecursible,
    List,
    MutuallyExclusiveProps
} from "./common.js"
import { Merge } from "./merge.js"
import { Narrow, narrow } from "./narrow.js"
import { asNumber } from "./stringUtils.js"

export type ListComparisonMode = "ordered" | "permutable" | "set"

export const defaultDiffOptions = narrow({
    baseKey: "base",
    compareKey: "compare",
    listComparison: "ordered"
})

export type DiffOptions = {
    baseKey?: string
    compareKey?: string
    listComparison?: ListComparisonMode
}

export const deepEquals = (base: any, compare: any, options?: DiffOptions) =>
    diff(base, compare, options) === undefined

type DefaultDiffOptions = typeof defaultDiffOptions

export type Change<
    Options extends DiffOptions,
    Config extends DiffOptions = Merge<DefaultDiffOptions, Options>
> = MutuallyExclusiveProps<
    {
        [K in Extract<
            Config["baseKey"] | Config["compareKey"],
            string
        >]: unknown
    },
    SetChange<Config["listComparison"] extends "ordered" ? string : unknown>
>

export type ChangesByPath<Options extends DiffOptions> = Record<
    string,
    Change<Options>
>

export const diff = <Options extends DiffOptions = {}>(
    base: unknown,
    compare: unknown,
    options?: Narrow<Options>
): ChangesByPath<Options> | undefined => {
    const changes: ChangesByPath<Options> = {}
    collectChanges(base, compare, {
        ...defaultDiffOptions,
        ...options,
        path: "/",
        changes
    } as any)
    return isEmpty(changes) ? undefined : changes
}

type DiffRecurseContext = {
    path: string
    changes: ChangesByPath<DiffOptions>
} & Required<DiffOptions>

const nextPath = (path: string, key: string) =>
    path === "/" ? key : `${path}/${key}`

const collectChanges = (base: any, compare: any, ctx: DiffRecurseContext) => {
    if (!isRecursible(base) || !isRecursible(compare)) {
        if (base !== compare) {
            ctx.changes[ctx.path] = {
                [ctx.baseKey]: base,
                [ctx.compareKey]: compare
            }
        }
        return
    }
    if (
        Array.isArray(base) &&
        Array.isArray(compare) &&
        ctx.listComparison !== "ordered"
    ) {
        const changes =
            ctx.listComparison === "set"
                ? diffSets(base, compare)
                : diffPermutables(base, compare)
        if (changes) {
            ctx.changes[ctx.path] = changes as any
        }
        return
    }
    const removedKeys: string[] = []
    const remainingCompareKeys = new Set(Object.keys(compare))
    for (const [key, baseValue] of Object.entries(base)) {
        if (key in compare) {
            collectChanges(baseValue, compare[key], {
                ...ctx,
                path: nextPath(ctx.path, key)
            })
            remainingCompareKeys.delete(key)
        } else {
            removedKeys.push(key)
        }
    }
    const addedKeys = remainingCompareKeys ? [...remainingCompareKeys] : []
    const keyChanges = toDiffSetsResult(addedKeys, removedKeys)
    if (keyChanges) {
        ctx.changes[ctx.path] = keyChanges as any
    }
}

const toDiffSetsResult = <T>(added: T[], removed: T[]) => {
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

export const diffPermutables = <Base extends List, Compare extends List>(
    base: Base,
    compare: Compare
): SetChange<ElementOf<Base> | ElementOf<Compare>> | undefined => {
    const added: any[] = []
    const removed: any[] = []
    const unseenCompareItems = [...compare]
    for (let baseIndex = 0; baseIndex < base.length; baseIndex++) {
        const matchingUnseenIndex = findFirstDeepEqualIndex(
            unseenCompareItems,
            base[baseIndex],
            "permutable"
        )
        if (matchingUnseenIndex === -1) {
            removed.push(base[baseIndex])
        } else {
            delete unseenCompareItems[matchingUnseenIndex]
        }
    }
    for (const unseenIndex in unseenCompareItems) {
        added.push(unseenCompareItems[unseenIndex])
    }
    return toDiffSetsResult(added, removed)
}

export const diffSets = <Base extends List, Compare extends List>(
    base: Base,
    compare: Compare
): SetChange<ElementOf<Base> | ElementOf<Compare>> | undefined => {
    const added: any[] = []
    const removed: any[] = []
    const removedDuplicateIndices = new Set<number>()
    const unseenCompareItems = [...compare]
    const seenCompareItems: any[] = []
    for (let baseIndex = 0; baseIndex < base.length; baseIndex++) {
        if (removedDuplicateIndices.has(baseIndex)) {
            continue
        }
        const matchingUnseenIndices = findDeepEqualIndices(
            unseenCompareItems,
            base[baseIndex],
            "set"
        )
        if (matchingUnseenIndices.length > 0) {
            // Even if there was more than one match, we only need to push one copy to seen
            seenCompareItems.push(unseenCompareItems[matchingUnseenIndices[0]])
            for (const matchingIndex of matchingUnseenIndices) {
                delete unseenCompareItems[matchingIndex]
            }
        } else {
            // When there are no matching unseen indices, check for matches in seen
            if (
                findFirstDeepEqualIndex(
                    seenCompareItems,
                    base[baseIndex],
                    "set"
                ) === -1
            ) {
                // If there are no matches in unseen or seen, add it to removed
                removed.push(base[baseIndex])
                // Then, mark all the item's deep-equals from base so we don't check them multiple times
                for (
                    let possibleDuplicateIndex = baseIndex + 1;
                    possibleDuplicateIndex < base.length;
                    possibleDuplicateIndex++
                ) {
                    if (
                        deepEquals(
                            base[baseIndex],
                            base[possibleDuplicateIndex],
                            {
                                listComparison: "set"
                            }
                        )
                    ) {
                        removedDuplicateIndices.add(
                            asNumber(possibleDuplicateIndex, { assert: true })
                        )
                    }
                }
            }
        }
    }
    for (const unseenIndex in unseenCompareItems) {
        added.push(unseenCompareItems[unseenIndex])
    }
    return toDiffSetsResult(added, removed)
}

type UnorderedDiffMode = Exclude<ListComparisonMode, "ordered">

const findDeepEqualIndices = (
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

const findFirstDeepEqualIndex = (
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
