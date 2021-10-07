import { MapFunction, EntryOf, Entry } from "./common.js"
import { isNumeric } from "./transformString.js"

export type TransformOptions = {
    asValueArray?: boolean
}

export const transform = <
    O extends object,
    MapReturnType extends Entry,
    Options extends TransformOptions = {},
    InferredAsArray extends boolean = MapReturnType[0] extends number
        ? O extends any[]
            ? true
            : false
        : false,
    AsArray extends boolean = "asValueArray" extends keyof Options
        ? Options["asValueArray"] extends undefined
            ? InferredAsArray
            : NonNullable<Options["asValueArray"]>
        : InferredAsArray,
    Result = AsArray extends true
        ? MapReturnType[1][]
        : {
              [K in MapReturnType[0]]: MapReturnType[1]
          }
>(
    o: O,
    map: MapFunction<EntryOf<O>, MapReturnType>,
    options?: Options
) => {
    if (!o || typeof o !== "object") {
        throw new Error(`Can only transform objects. Received: ${o}.`)
    }
    const mappedEntries = Object.entries(o).map(map as any) as MapReturnType[]
    const asArray =
        options?.asValueArray ??
        (Array.isArray(o) && mappedEntries.every(([k, v]) => isNumeric(k)))
    const mappedResult = asArray
        ? Array.from(mappedEntries, ([i, v]) => v)
        : Object.fromEntries(mappedEntries)
    return mappedResult as Result
}
