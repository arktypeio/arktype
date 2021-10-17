import {
    MapFunction,
    EntryOf,
    Entry,
    fromEntries,
    isRecursible
} from "./common.js"
import { WithDefaults } from "./merge.js"
import { isNumeric } from "./transformString.js"

export type DeepMapContext = {
    path: string[]
}

export type EntryChecker = (entry: Entry, context: DeepMapContext) => boolean

export type EntryMapper<Original extends Entry, Returned extends Entry> = (
    entry: Original,
    context: DeepMapContext
) => Returned

export type DeepMapOptions = {
    recurseWhen?: EntryChecker
    filterWhen?: EntryChecker
    asValueArray?: "infer" | "forceArray" | "forceRecord"
}

export const transform = <
    O,
    MapReturnType extends Entry,
    ProvidedOptions extends DeepMapOptions,
    Options extends Required<DeepMapOptions> = WithDefaults<
        DeepMapOptions,
        ProvidedOptions,
        {
            recurseWhen: () => true
            filterWhen: () => false
            asValueArray: "infer"
        }
    >,
    InferredAsArray extends boolean = MapReturnType[0] extends number
        ? O extends any[]
            ? true
            : false
        : false,
    AsArray extends boolean = Options["asValueArray"] extends ""
        ? InferredAsArray
        : Options["asValueArray"] & boolean,
    Result = AsArray extends true
        ? MapReturnType[1][]
        : {
              [K in MapReturnType[0]]: MapReturnType[1]
          }
>(
    from: O,
    map: EntryMapper<EntryOf<O>, MapReturnType>,
    { recurseWhen, filterWhen, asValueArray }: DeepMapOptions = {}
): Result => {
    const recurse = (currentFrom: any, { path }: DeepMapContext): any => {
        const mappedEntries = Object.entries(currentFrom).reduce(
            (mappedEntries, [k, v]) => {
                const contextForKey = {
                    path: path.concat(k)
                }
                if (filterWhen && filterWhen([k, v], contextForKey)) {
                    return mappedEntries
                }
                const shouldRecurse =
                    isRecursible(v) &&
                    (!recurseWhen || recurseWhen([k, v], contextForKey))
                return [
                    ...mappedEntries,
                    map(
                        [
                            k as any,
                            shouldRecurse ? recurse(v, contextForKey) : v
                        ],
                        contextForKey
                    )
                ]
            },
            [] as MapReturnType[]
        )
        const asArray =
            asValueArray ??
            (Array.isArray(currentFrom) &&
                mappedEntries.every(([k, v]) => isNumeric(k)))
        const mappedResult = asArray
            ? Array.from(mappedEntries, ([i, v]) => v)
            : Object.fromEntries(mappedEntries)
        return mappedResult
    }
    return recurse(from, { path: [] })
}
