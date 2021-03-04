import { Object, Function, String } from "ts-toolbelt"
import { AutoPath } from "./Autopath"

// export const valueAtPath = <O extends object, P extends string>(
//     obj: O,
//     path: Function.AutoPath<O, P>
// ): Object.Path<O, Split<P, ".">> => {
//     let value = obj
//     for (let segment of path) {
//         if (typeof value === "object" && segment in value) {
//             value = (value as any)[segment]
//         } else {
//             // This should never happen if the provided types are accurate
//             return undefined as any
//         }
//     }
//     return value as Object.Path<T, P>
// }

// const x = valueAtPath({ a: { b: 1 } }, ["h"])

export function valueAtPath<O extends object, P extends string>(
    obj: O,
    path: AutoPath<O, P, "/">
): Object.Path<O, String.Split<P, "/">> {
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
