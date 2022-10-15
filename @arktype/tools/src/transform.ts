import type { Dictionary, Entry, EntryOf } from "./common.js"
import type { Evaluate } from "./evaluate.js"

export type MapEntryFn<In extends Entry = Entry, Out extends Entry = Entry> = (
    input: In
) => Out

export type MapValueFn<In = unknown, Out = unknown> = (input: In) => Out

export type MapValues<O, F extends MapValueFn<O[keyof O]>> = Evaluate<{
    [K in keyof O]: ReturnType<F>
}>

type EntryMapResult<ReturnedEntry extends Entry> =
    ReturnedEntry[0] extends number
        ? ReturnedEntry[1][]
        : Dictionary<ReturnedEntry[1]>

type TransformEntriesOfFn = <O, F extends MapEntryFn<EntryOf<O>>>(
    o: O,
    mapEntryFn: F
) => EntryMapResult<ReturnType<F>>

type TransformEntriesFn = <E extends Entry, F extends MapEntryFn<E>>(
    entries: E[],
    mapEntryFn: F
) => EntryMapResult<ReturnType<F>>

export const transformEntriesOf: TransformEntriesOfFn = (o, mapEntryFn) =>
    transformEntries(Object.entries(o as any), mapEntryFn as any) as any

export const transformEntries: TransformEntriesFn = (inEntries, mapEntryFn) => {
    const indexedOutValues: any[] = []
    const outEntries = inEntries.map((entry, i) => {
        const outEntry = mapEntryFn(entry as any)
        if (outEntry[0] === i) {
            indexedOutValues.push(outEntry[1])
        }
        return outEntry
    })
    return inEntries.length === indexedOutValues.length
        ? indexedOutValues
        : (Object.fromEntries(outEntries) as any)
}

export type MapValuesFn = <O, F extends MapValueFn<O[keyof O]>>(
    o: O,
    mapFn: F
) => MapValues<O, F>

export const mapValues: MapValuesFn = (o, mapFn) => {
    if (Array.isArray(o)) {
        return o.map(mapFn) as any
    } else {
        const result: Record<string, unknown> = {}
        for (const k in o) {
            result[k] = mapFn(o[k])
        }
        return result
    }
}

export const mutateValues: MapValuesFn = (o, mapFn) => {
    if (Array.isArray(o)) {
        for (let i = 0; i < o.length; i++) {
            o[i] = mapFn(o[i])
        }
    } else {
        for (const k in o) {
            o[k] = mapFn(o[k] as any) as any
        }
    }
    return o as any
}
