import type { Evaluate } from "./evaluate.js"

export type MapFn<In = unknown, Out = unknown> = (input: In) => Out

export type MapValues<
    O extends object,
    F extends MapFn<O[keyof O]>
> = Evaluate<{
    [K in keyof O]: ReturnType<F>
}>

export const mapValues = <O extends object, F extends MapFn<O[keyof O]>>(
    o: O,
    mapFn: F
) => {
    if (Array.isArray(o)) {
        return o.map(mapFn) as MapValues<O, F>
    } else {
        const result: Record<string, unknown> = {}
        for (const k in o) {
            result[k] = mapFn(o[k])
        }
        return result as MapValues<O, F>
    }
}

export const mutateValues = <O extends object, F extends MapFn<O[keyof O]>>(
    o: O,
    mapFn: F
) => {
    for (const k in o) {
        o[k] = mapFn(o[k] as any) as any
    }
    return o as MapValues<O, F>
}
