import {
    isRecursible,
    DeepPartial,
    Cast,
    ListPossibleTypes,
    NonRecursible,
    Or,
    split,
    Entry,
    isEmpty
} from "./common.js"
import { transform } from "./transform.js"

export type UnionDiffResult<Added extends any[], Removed extends any[]> = {
    added: Added
    removed: Removed
}

export type DiffUnions<Base, Compare> = UnionDiffResult<
    Cast<ListPossibleTypes<Compare extends Base ? never : Compare>, Compare[]>,
    Cast<ListPossibleTypes<Base extends Compare ? never : Base>, Base[]>
>

export type ChangeResult<Base, Compare> = {
    [K in keyof Base & keyof Compare]?: Or<
        Base[K] extends NonRecursible ? true : false,
        Compare[K] extends NonRecursible ? true : false
    > extends true
        ? ShallowDiffResult<Base[K], Compare[K]>
        : ObjectDiffResult<Base[K], Compare[K]>
}

export type ObjectDiffResult<Base, Compare> = {
    added?: Partial<Compare>
    removed?: Partial<Base>
    changed?: ChangeResult<Base, Compare>
}

export type DeepDiffResult<Base, Compare> =
    | ObjectDiffResult<Base, Compare>
    | ShallowDiffResult<Base, Compare>

export type ShallowDiffResult<Base, Compare> =
    | undefined
    | {
          base: Base
          compare: Compare
      }

export type DiffOptions = {
    excludeAdded?: boolean
    excludeRemoved?: boolean
    excludeChanged?: boolean
    shallowListResults?: boolean
    ignoreListOrder?: boolean
}

export type DeepEqualsOptions = Pick<DiffOptions, "ignoreListOrder">

export const deepEquals = (
    base: any,
    compare: any,
    options: DeepEqualsOptions = {}
) => !diff(base, compare, options)

export const diff = <Base, Compare>(
    base: Base,
    compare: Compare,
    options: DiffOptions = {}
): DeepDiffResult<Base, Compare> => {
    if (
        Array.isArray(base) &&
        Array.isArray(compare) &&
        options.shallowListResults
    ) {
        return deepEquals(base, compare, {
            ignoreListOrder: options.ignoreListOrder ?? false
        })
            ? undefined
            : { base, compare }
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
    if (addedKeys.length && !options.excludeAdded) {
        result.added = Object.fromEntries(
            addedKeys.map((k) => [k, compare[k]])
        ) as any as Partial<Compare>
    }
    const removedKeys = baseKeys.filter(
        (baseKey) => !compareKeys.includes(baseKey as any)
    )
    if (removedKeys.length && !options.excludeRemoved) {
        result.removed = Object.fromEntries(
            removedKeys.map((k) => [k, base[k]])
        ) as any as Partial<Base>
    }
    const changedEntries = preserved
        .map(
            (k) =>
                [
                    k,
                    diff((base as any)[k], (compare as any)[k], options)
                ] as Entry
        )
        .filter(([, changes]) => changes !== undefined)
    if (changedEntries.length && !options.excludeChanged) {
        result.changed = Object.fromEntries(changedEntries) as any
    }
    return isEmpty(result) ? undefined : result
}

export type DiffSetsOptions = {}

export type DiffSetsResult<T = any> =
    | undefined
    | {
          added?: T[]
          removed?: T[]
      }

export const diffSets = <T>(base: T[], compare: T[]) => {
    const added = compare.filter(
        (compareItem) =>
            !base.find((baseItem) => deepEquals(compareItem, baseItem))
    )
    const removed = base.filter(
        (baseItem) =>
            !compare.find((compareItem) => deepEquals(baseItem, compareItem))
    )
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
