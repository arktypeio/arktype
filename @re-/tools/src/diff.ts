import {
    And,
    Cast,
    DeepPartial,
    Entry,
    isEmpty,
    isRecursible,
    ListPossibleTypes,
    NonRecursible,
    Or,
    split
} from "./common.js"
import { transform } from "./transform.js"

export type UnionDiffResult<
    Added extends unknown[],
    Removed extends unknown[]
> = {
    added: Added
    removed: Removed
}

export type DiffUnions<Base, Compare> = UnionDiffResult<
    Cast<ListPossibleTypes<Compare extends Base ? never : Compare>, Compare[]>,
    Cast<ListPossibleTypes<Base extends Compare ? never : Base>, Base[]>
>

type IsList<T> = T extends T[] | readonly T[] ? true : false

export type ChangeResult<Base, Compare, Unordered extends boolean = false> = {
    [K in keyof Base & keyof Compare]?: Or<
        Base[K] extends NonRecursible ? true : false,
        Compare[K] extends NonRecursible ? true : false
    > extends true
        ? ShallowDiffResult<Base[K], Compare[K]>
        : [Unordered, IsList<Base[K]>, IsList<Compare[K]>] extends [
              true,
              true,
              true
          ]
        ? DiffSetsResult<Base[K][keyof Base[K]]>
        : ObjectDiffResult<Base[K], Compare[K]>
}

export type ObjectDiffResult<Base, Compare> = {
    added?: Partial<Compare>
    removed?: Partial<Base>
    changed?: ChangeResult<Base, Compare>
}

export type DeepDiffResult<Base, Compare, Unordered extends boolean = false> =
    | ObjectDiffResult<Base, Compare>
    | ShallowDiffResult<Base, Compare>

export type ShallowDiffResult<Base, Compare> =
    | undefined
    | {
          base: Base
          compare: Compare
      }

export type ListComparisonMode =
    | "ordered"
    | "unordered"
    | "deepUnordered"
    | "set"
    | "deepSets"

export type DiffOptions = {
    excludeAdded?: boolean
    excludeRemoved?: boolean
    excludeChanged?: boolean
    shallowListResults?: boolean
    listComparison?: ListComparisonMode
}

export type DeepEqualsOptions = Pick<DiffOptions, "listComparison">

export const deepEquals = (
    base: any,
    compare: any,
    options: DeepEqualsOptions = {}
) => !diff(base, compare, options)

export const diff = <Base, Compare, Options extends DiffOptions>(
    base: Base,
    compare: Compare,
    options?: Options
): DeepDiffResult<
    Base,
    Compare,
    Options["listComparison"] extends
        | "unordered"
        | "deepUnordered"
        | "set"
        | "deepSets"
        ? true
        : false
> => {
    const config: DiffOptions = options ?? {}
    if (Array.isArray(base) && Array.isArray(compare)) {
        if (config.shallowListResults) {
            return deepEquals(base, compare, {
                listComparison: config.listComparison ?? "ordered"
            })
                ? undefined
                : { base, compare }
        }
        if (
            config.listComparison === "unordered" ||
            config.listComparison === "deepUnordered"
        ) {
            return diffUnordered(
                base,
                compare,
                config.listComparison === "deepUnordered"
            ) as any
        } else if (
            config.listComparison === "set" ||
            config.listComparison === "deepSets"
        ) {
            return diffSets(
                base,
                compare,
                config.listComparison === "deepSets"
            ) as any
        }
    }
    if (!isRecursible(base) || !isRecursible(compare)) {
        return base === (compare as unknown) ? undefined : { base, compare }
    }
    const result: ObjectDiffResult<Base, Compare> = {}
    const baseKeys = Object.keys(base) as (keyof Base)[]
    const compareKeys = Object.keys(compare) as (keyof Compare)[]
    const [addedKeys, preserved] = split(
        compareKeys,
        (compareKey) => !baseKeys.includes(compareKey as any)
    )
    if (addedKeys.length && !config.excludeAdded) {
        result.added = Object.fromEntries(
            addedKeys.map((k) => [k, compare[k]])
        ) as any as Partial<Compare>
    }
    const removedKeys = baseKeys.filter(
        (baseKey) => !compareKeys.includes(baseKey as any)
    )
    if (removedKeys.length && !config.excludeRemoved) {
        result.removed = Object.fromEntries(
            removedKeys.map((k) => [k, base[k]])
        ) as any as Partial<Base>
    }
    const changedEntries = preserved
        .map(
            (k) =>
                [
                    k,
                    diff((base as any)[k], (compare as any)[k], config)
                ] as Entry
        )
        .filter(([, changes]) => changes !== undefined)
    if (changedEntries.length && !config.excludeChanged) {
        result.changed = Object.fromEntries(changedEntries) as any
    }
    return isEmpty(result) ? undefined : result
}

export type DiffSetsResult<T = unknown> =
    | undefined
    | {
          added?: T[]
          removed?: T[]
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

export const diffUnordered = <T>(
    base: T[],
    compare: T[],
    deepUnordered = false
) => {
    const added: T[] = []
    const removed: T[] = []
    const unusedCompareItems = [...compare]
    for (let baseIndex = 0; baseIndex < base.length; baseIndex++) {
        let matchingCompareIndex
        for (let compareIndex in unusedCompareItems) {
            if (
                deepEquals(base[baseIndex], unusedCompareItems[compareIndex], {
                    listComparison: deepUnordered ? "deepUnordered" : "ordered"
                })
            ) {
                matchingCompareIndex = compareIndex
                break
            }
        }
        if (matchingCompareIndex === undefined) {
            removed.push(base[baseIndex])
        } else {
            delete unusedCompareItems[matchingCompareIndex as any]
        }
    }
    for (let unusedIndex in unusedCompareItems) {
        added.push(unusedCompareItems[unusedIndex])
    }
    return toDiffSetsResult(added, removed)
}

export const includesDeepEqual = (
    list: unknown[],
    item: unknown,
    options: DeepEqualsOptions
) => list.some((listItem) => deepEquals(listItem, item, options))

export const diffSets = <T>(base: T[], compare: T[], deepSets = false) => {
    const options: DeepEqualsOptions = {
        listComparison: deepSets ? "deepSets" : "ordered"
    }
    const added: T[] = []
    const removed: T[] = []
    for (const compareItem of compare) {
        if (
            !includesDeepEqual(base, compareItem, options) &&
            !includesDeepEqual(added, compareItem, options)
        ) {
            added.push(compareItem)
        }
    }
    for (const baseItem of base) {
        if (
            !includesDeepEqual(compare, baseItem, options) &&
            !includesDeepEqual(removed, baseItem, options)
        ) {
            removed.push(baseItem)
        }
    }
    return toDiffSetsResult(added, removed)
}

export const addedOrChanged = <Base, Compare>(
    base: Base,
    compare: Compare
): DeepPartial<Compare> => {
    const diffResult = diff(base, compare, {
        excludeRemoved: true,
        shallowListResults: true
    })
    if (!diffResult) {
        return {}
    }
    const extractAddedOrChanged = (result: DeepDiffResult<any, any>): any => {
        if (result) {
            if ("compare" in result) {
                return result.compare
            } else {
                const extractedChanged = result.changed
                    ? transform(result.changed, ([k, v]) => [
                          k,
                          extractAddedOrChanged(v)
                      ])
                    : {}
                return {
                    ...result.added,
                    ...extractedChanged
                }
            }
        }
    }
    return extractAddedOrChanged(diffResult)
}
