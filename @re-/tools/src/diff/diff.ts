import type { MutuallyExclusiveProps } from "../common.js"
import { isEmpty, isRecursible } from "../common.js"
import type { Merge } from "../merge.js"
import type { Narrow } from "../narrow.js"
import { narrow } from "../narrow.js"
import { diffPermutables } from "./permutables.js"
import { diffSets } from "./sets.js"
import type { SetChange } from "./unordered.js"
import { toDiffSetsResult } from "./unordered.js"

export type DiffOptions = {
    baseKey?: string
    compareKey?: string
    listComparison?: ListComparisonMode
}

export const defaultDiffOptions = narrow({
    baseKey: "base",
    compareKey: "compare",
    listComparison: "ordered"
})

type DefaultDiffOptions = typeof defaultDiffOptions

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

export const deepEquals = (base: any, compare: any, options?: DiffOptions) =>
    diff(base, compare, options) === undefined

export type ListComparisonMode = "ordered" | "permutable" | "set"

export type ChangesByPath<Options extends DiffOptions> = Record<
    string,
    Change<Options>
>

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

type DiffRecurseState = {
    path: string
    changes: ChangesByPath<DiffOptions>
} & Required<DiffOptions>

const nextPath = (path: string, key: string) =>
    path === "/" ? key : `${path}/${key}`

const collectChanges = (base: any, compare: any, state: DiffRecurseState) => {
    if (!isRecursible(base) || !isRecursible(compare)) {
        addShallowChangesAtPath(base, compare, state)
    } else if (
        Array.isArray(base) &&
        Array.isArray(compare) &&
        state.listComparison !== "ordered"
    ) {
        addUnorderedListChangesAtPath(base, compare, state)
    } else {
        recurseForRecordLikeChanges(base, compare, state)
    }
}

const addShallowChangesAtPath = (
    base: any,
    compare: any,
    state: DiffRecurseState
) => {
    if (base !== compare) {
        state.changes[state.path] = {
            [state.baseKey]: base,
            [state.compareKey]: compare
        }
    }
}

const addUnorderedListChangesAtPath = (
    base: any,
    compare: any,
    state: DiffRecurseState
) => {
    const changes =
        state.listComparison === "set"
            ? diffSets(base, compare)
            : diffPermutables(base, compare)
    if (changes) {
        state.changes[state.path] = changes as any
    }
}

const recurseForRecordLikeChanges = (
    base: any,
    compare: any,
    state: DiffRecurseState
) => {
    const removedKeys: string[] = []
    const remainingCompareKeys = new Set(Object.keys(compare))
    for (const [key, baseValue] of Object.entries(base)) {
        if (key in compare) {
            collectChanges(baseValue, compare[key], {
                ...state,
                path: nextPath(state.path, key)
            })
            remainingCompareKeys.delete(key)
        } else {
            removedKeys.push(key)
        }
    }
    const addedKeys = remainingCompareKeys ? [...remainingCompareKeys] : []
    const keyChanges = toDiffSetsResult(addedKeys, removedKeys)
    if (keyChanges) {
        state.changes[state.path] = keyChanges as any
    }
}
