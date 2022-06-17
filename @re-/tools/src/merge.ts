import { Evaluate, Iteration, KeyValuate } from "./common.js"

export const merge = <Objs extends unknown[]>(...objs: Objs) =>
    pairwiseMerge(objs, shallowMerge) as MergeAll<Objs>

// Currently returns never if string and number keys of the same name are merged, e.g.:
// type Result = Merge<{1: false}, {"1": true}> //never
// This feels too niche to fix at the cost of performance and complexity, but that could change
// It also overrides values with undefined, unlike the associated function. We'll have to see if this is problematic.
export type Merge<Base, Merged> = Evaluate<
    Omit<ExtractMergeable<Base>, Extract<keyof Base, keyof Merged>> &
        ExtractMergeable<Merged>
>

export type MergeAll<Types, Result = {}> = Types extends Iteration<
    unknown,
    infer Current,
    infer Remaining
>
    ? MergeAll<Remaining, Merge<Result, Current>>
    : Evaluate<Result>

export const deepMerge = <Objs extends unknown[]>(...objs: Objs) =>
    pairwiseMerge(objs, recursiveMerge) as DeepMergeAll<Objs>

export type DeepMerge<Base, Merged> = Base | Merged extends Mergeable
    ? {
          [K in keyof Base | keyof Merged]: K extends keyof Base & keyof Merged
              ? DeepMerge<Base[K], Merged[K]>
              : K extends keyof Merged
              ? Merged[K]
              : KeyValuate<Base, K>
      }
    : Merged

export type DeepMergeAll<Types, Result = {}> = Types extends Iteration<
    unknown,
    infer Current,
    infer Remaining
>
    ? DeepMergeAll<Remaining, DeepMerge<Result, Current>>
    : Evaluate<Result>

type ExtractMergeable<T> = T extends {} ? T : {}

type MergeFn = (base: Mergeable, merged: Mergeable) => Mergeable

const pairwiseMerge = (objs: unknown[], mergeFn: MergeFn) => {
    // Instead of throwing an error when an object is undefined, just don't merge it
    let remaining = objs.filter((_) => _ !== undefined) as Mergeable[]
    if (!remaining.length) {
        return undefined
    }
    assertMergeable(remaining)
    while (remaining.length > 1) {
        const mergedPairs = []
        let i = 0
        while (i in remaining) {
            if (i + 1 in remaining) {
                mergedPairs[i / 2] = mergeFn(remaining[i], remaining[i + 1])
            } else {
                mergedPairs.push(remaining[i])
            }
            i += 2
        }
        remaining = mergedPairs
    }
    return remaining[0]
}

type AssertMergeableFunction = (
    values: unknown[]
) => asserts values is Mergeable[]

const assertMergeable: AssertMergeableFunction = (values) => {
    for (const value of values) {
        if (!isMergeable(value)) {
            throw new Error(
                `Unable to merge non-object '${value}' of type ${typeof value}.`
            )
        }
    }
}

type Mergeable = Record<string | number | symbol, unknown>

const isMergeable = (
    value: unknown
): value is Record<string | number | symbol, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value)

const shallowMerge = (base: Mergeable, merged: Mergeable) => {
    const result: Mergeable = { ...merged }
    for (const key in base) {
        if (merged[key] === undefined) {
            // If merged either doesn't contain key or key's value is undefined, use base
            result[key] = base[key]
        }
    }
    return result
}

const recursiveMerge = (base: Mergeable, merged: Mergeable) => {
    const result = shallowMerge(base, merged)
    for (const key of Object.keys(result)) {
        if (
            key in base &&
            key in merged &&
            isMergeable(base[key]) &&
            isMergeable(merged[key])
        ) {
            result[key] = recursiveMerge(base[key] as any, merged[key] as any)
        }
    }
    return result
}
