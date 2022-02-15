import { EntryOf, Entry, isRecursible } from "./common.js"
import { WithDefaults } from "./merge.js"
import { isNumeric } from "./stringUtils.js"

export type DeepMapContext = {
    path: string[]
}

export type EntryChecker = (entry: Entry, context: DeepMapContext) => boolean

export type EntryMapper<
    Original extends Entry,
    Returned extends Entry | null
> = (entry: Original, context: DeepMapContext) => Returned

export type TransformOptions<Deep extends boolean = boolean> = {
    deep?: Deep
    recurseWhen?: EntryChecker
    asArray?: "infer" | "always" | "never"
}

export const transform = <
    From,
    MapReturnType extends Entry | null,
    ProvidedOptions extends TransformOptions<Deep>,
    Options extends Required<TransformOptions> = WithDefaults<
        TransformOptions,
        ProvidedOptions,
        {
            recurseWhen: () => true
            filterWhen: () => false
            asArray: "infer"
            deep: false
        }
    >,
    Deep extends boolean = true,
    InferredAsArray extends boolean = MapReturnType extends Entry
        ? MapReturnType[0] extends number
            ? From extends any[]
                ? true
                : false
            : false
        : false,
    AsArray extends boolean = Options["asArray"] extends "infer"
        ? InferredAsArray
        : Options["asArray"] extends "always"
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
                    path: path.concat(k)
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
                  mappedEntries.every(([k, v]) => isNumeric(k))
        return toArray
            ? Array.from(mappedEntries, ([i, v]) => v)
            : Object.fromEntries(mappedEntries)
    }
    if (!isRecursible(from)) {
        throw new Error(`Cannot transform non-object ${from}.`)
    }
    return recurse(from, { path: [] })
}
