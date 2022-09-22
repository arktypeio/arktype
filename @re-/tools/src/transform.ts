import type { Entry, EntryOf } from "./common.js"
import type { Evaluate } from "./evaluate.js"

export type MapEntryFn<In extends Entry = Entry, Out extends Entry = Entry> = (
    input: In
) => Out

export type MapValueFn<In = unknown, Out = unknown> = (input: In) => Out

export type MapValues<O, F extends MapValueFn<O[keyof O]>> = Evaluate<{
    [K in keyof O]: ReturnType<F>
}>

type TransformFn = <O, F extends MapEntryFn<EntryOf<O>>>(
    o: O,
    mapEntryFn: F
) => ReturnType<F>[0] extends number
    ? ReturnType<F>[1][]
    : Record<string, ReturnType<F>[1]>

export const transform: TransformFn = (o, mapEntryFn) => {
    const inEntries = Object.entries(o as object)
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
    for (const k in o) {
        o[k] = mapFn(o[k] as any) as any
    }
    return o as any
}
