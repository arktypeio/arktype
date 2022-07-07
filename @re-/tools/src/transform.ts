import { Entry, EntryOf, isRecursible } from "./common.js"
import { Merge } from "./merge.js"
import { isNumeric } from "./stringUtils.js"

export type DeepMapContext = {
    path: string[]
}

export type EntryChecker = (entry: Entry, context: DeepMapContext) => boolean

export type EntryMapper<
    Original extends Entry,
    Returned extends Entry | null
> = (entry: Original, context: DeepMapContext) => Returned

export type TransformOptions = {
    deep?: boolean
    recurseWhen?: EntryChecker
    asArray?: "infer" | "always" | "never"
}

export const transform = <
    From,
    MapReturnType extends Entry | null,
    ProvidedOptions extends TransformOptions,
    Options extends TransformOptions = Merge<
        {
            recurseWhen: () => true
            filterWhen: () => false
            asArray: "infer"
            deep: false
        },
        ProvidedOptions
    >,
    InferredAsArray extends boolean = MapReturnType extends Entry
        ? MapReturnType[0] extends number
            ? From extends unknown[]
                ? true
                : false
            : false
        : false,
    AsArray extends boolean = "infer" extends Options["asArray"]
        ? InferredAsArray
        : "always" extends Options["asArray"]
        ? true
        : false,
    Result = AsArray extends true
        ? Exclude<MapReturnType, null>[1][]
        : {
              [K in Exclude<MapReturnType, null>[0]]: Exclude<
                  MapReturnType,
                  null
              >[1]
          }
>(
    from: From,
    map: EntryMapper<EntryOf<From>, MapReturnType>,
    options?: ProvidedOptions
): Result => {
    const { recurseWhen, deep, asArray = "infer" } = options ?? {}
    const recurse = (currentFrom: any, { path }: DeepMapContext): any => {
        const mappedEntries = Object.entries(currentFrom).reduce(
            (results, [k, v]) => {
                const contextForKey = {
                    path: [...path, k]
                }
                const shouldRecurse =
                    isRecursible(v) &&
                    deep &&
                    (!recurseWhen || recurseWhen([k, v], contextForKey))
                const mapResult = map(
                    [k as any, shouldRecurse ? recurse(v, contextForKey) : v],
                    contextForKey
                )
                if (mapResult === null) {
                    return results
                }
                return [...results, mapResult] as Exclude<MapReturnType, null>[]
            },
            [] as Exclude<MapReturnType, null>[]
        )
        const toArray =
            asArray === "always"
                ? true
                : asArray === "never"
                ? false
                : Array.isArray(currentFrom) &&
                  mappedEntries.every(([k]) => isNumeric(k))
        return toArray
            ? [...mappedEntries].map(([, v]) => v)
            : Object.fromEntries(mappedEntries)
    }
    if (!isRecursible(from)) {
        throw new Error(
            `Cannot transform non-object '${String(
                from
            )}' of type ${typeof from}.`
        )
    }
    return recurse(from, { path: [] })
}
