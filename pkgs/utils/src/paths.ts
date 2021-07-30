import { Object, String } from "ts-toolbelt"
import { AutoPath } from "./AutoPath"

export type ValueAtPath<O extends object, P extends string> = Object.Path<
    O,
    String.Split<P, "/">
>

export function valueAtPath<O extends object, P extends string>(
    obj: O,
    path: AutoPath<O, P, "/">
): ValueAtPath<O, P> {
    const segments = path.split("/")
    let value = obj
    for (let segment of segments) {
        if (typeof value === "object" && segment in value) {
            value = (value as any)[segment]
        } else {
            // This should never happen if the provided types are accurate
            return undefined as any
        }
    }
    return value as any
}
