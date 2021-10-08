import {
    Evaluate,
    isRecursible,
    NonRecursible,
    Iteration,
    ExcludeByValue,
    ElementOf,
    And,
    GetRequiredKeys,
    WithRequiredKeysIfPresent,
    Entry,
    OptionalOnly
} from "./common.js"
import { ExcludedByKey } from "./excludeKeys.js"
import { transform } from "./transform.js"
import { Narrow } from "./Narrow.js"
export type DefaultMergeOptions = {
    deep: false
    unmerged: [undefined]
    preserveRequired: false
}

export type Merge<
    Base,
    Merged,
    ProvidedOptions extends MergeOptions = {},
    Options extends Required<MergeOptions> = {
        deep: ProvidedOptions["deep"] extends boolean
            ? ProvidedOptions["deep"]
            : DefaultMergeOptions["deep"]
        unmerged: ProvidedOptions["unmerged"] extends any[]
            ? ProvidedOptions["unmerged"]
            : DefaultMergeOptions["unmerged"]
        preserveRequired: ProvidedOptions["preserveRequired"] extends boolean
            ? ProvidedOptions["preserveRequired"]
            : DefaultMergeOptions["preserveRequired"]
    },
    TypeToMerge = WithRequiredKeysIfPresent<
        ExcludeByValue<Merged & object, ElementOf<Options["unmerged"]>>,
        Options["preserveRequired"] extends true
            ? GetRequiredKeys<Base & object>
            : never
    >,
    TypeToPreserve = ExcludedByKey<Base, keyof TypeToMerge>
> = Base extends any[] | NonRecursible
    ? Merged
    : Merged extends any[] | NonRecursible
    ? Base
    : Evaluate<
          TypeToPreserve &
              {
                  [K in keyof TypeToMerge]: And<
                      Options["deep"],
                      K extends keyof Base ? true : false
                  > extends true
                      ? Merge<Base[K & keyof Base], TypeToMerge[K], Options>
                      : TypeToMerge[K]
              }
      >

export type MergeAll<
    Objects,
    Result extends object = {}
> = Objects extends Iteration<any, infer Current, infer Remaining>
    ? MergeAll<Remaining, Merge<Result, Current>>
    : Result

export type FromEntries<
    Entries extends Entry[],
    Result extends object = {}
> = Entries extends Iteration<Entry, infer Current, infer Remaining>
    ? FromEntries<Remaining, Merge<Result, { [K in Current[0]]: Current[1] }>>
    : Result

export type MergeOptions = {
    deep?: boolean
    unmerged?: any[]
    preserveRequired?: boolean
}

export const defaultMergeOptions: Required<MergeOptions> = {
    deep: false,
    unmerged: [undefined],
    preserveRequired: false
}

export const merge = <
    Base,
    Merged,
    Options extends MergeOptions = DefaultMergeOptions
>(
    base: Narrow<Base>,
    merged: Narrow<Merged>,
    options?: Options
): Merge<Base, Merged, Options> => {
    const { deep, unmerged } = {
        ...defaultMergeOptions,
        ...options
    }
    if (Array.isArray(base) || Array.isArray(merged)) {
        return merged as any
    } else if (isRecursible(base) && isRecursible(merged)) {
        const baseRecursible: any = base
        const mergedRecursible: any = merged
        return transform({ ...base, ...merged } as any, ([k, v]) => {
            if (k in mergedRecursible && k in baseRecursible) {
                if (unmerged.includes(v)) {
                    return [k, baseRecursible[k]]
                }
                if (deep) {
                    return [
                        k,
                        merge(baseRecursible[k], mergedRecursible[k], options)
                    ]
                }
            }
            return [k, v]
        })
    } else {
        return merged as any
    }
}

export const mergeAll = <Objects extends object[]>(
    ...objects: Narrow<Objects>
): MergeAll<Objects> =>
    (objects.length
        ? {
              ...objects[0],
              ...mergeAll(...objects.slice(1))
          }
        : {}) as MergeAll<Objects>

export const withDefaults =
    <Options extends Record<string, any>>(
        defaults: Required<OptionalOnly<Options>>
    ) =>
    (provided: Options | undefined) => {
        return { ...defaults, ...provided }
    }

export type WithDefaults<
    Options extends Record<string, any>,
    Provided extends Options,
    Defaults extends Required<Options>,
    ActiveOptions = Merge<Defaults, Provided>
> = ActiveOptions extends Required<Options> ? ActiveOptions : Defaults
